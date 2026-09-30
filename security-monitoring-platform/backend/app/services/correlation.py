from datetime import datetime
from typing import Optional, List, Dict, Set
from sqlalchemy.orm import Session
from app.models.event import Event
from app.models.user import User
from app.models.session import Session as SessionModel
from app.models.resource import Resource
from app.models.relationship import Relationship
from app.models.alert import SecurityAlert
from app.schemas.graph_schema import GraphDataOut, GraphNode, GraphNodeData, GraphEdge, GraphEdgeData

def correlate_event(db: Session, event: Event):
    """
    Extracts and stores entity relationships from an incoming event.
    """
    ts = event.timestamp

    # 1. SERVER -> USER
    if event.user_id:
        _ensure_relationship(db, "SERVER", "SERVER", "USER", event.user_id, "MONITORS", ts)

    # 2. USER -> SESSION
    if event.user_id and event.session_id:
        _ensure_relationship(db, "USER", event.user_id, "SESSION", event.session_id, "HAS_SESSION", ts)

    # 3. SESSION -> IP
    if event.session_id and event.ip:
        _ensure_relationship(db, "SESSION", event.session_id, "IP", event.ip, "BOUND_TO_IP", ts)

    # 4. USER -> IP
    if event.user_id and event.ip:
        _ensure_relationship(db, "USER", event.user_id, "IP", event.ip, "OBSERVED_AT", ts)

    # 5. SESSION -> RESOURCE
    if event.session_id and event.resource:
        _ensure_relationship(db, "SESSION", event.session_id, "RESOURCE", event.resource, "ACCESSED", ts)

    # 6. USER -> RESOURCE
    if event.user_id and event.resource:
        _ensure_relationship(db, "USER", event.user_id, "RESOURCE", event.resource, "ACCESSED", ts)


def _ensure_relationship(db: Session, s_type: str, s_id: str, t_type: str, t_id: str, rel: str, ts: datetime):
    exists = db.query(Relationship).filter(
        Relationship.source_type == s_type,
        Relationship.source_id == s_id,
        Relationship.target_type == t_type,
        Relationship.target_id == t_id,
        Relationship.relation_type == rel
    ).first()

    if not exists:
        r = Relationship(
            source_type=s_type,
            source_id=s_id,
            target_type=t_type,
            target_id=t_id,
            relation_type=rel,
            timestamp=ts
        )
        db.add(r)
        try:
            db.commit()
        except Exception:
            db.rollback()


def build_graph(db: Session, up_to_timestamp: Optional[datetime] = None) -> GraphDataOut:
    """
    Constructs Cytoscape-compatible graph data.
    If up_to_timestamp is supplied, only relationships and entities active up to that timestamp are included.
    """
    # 1. Fetch relationships
    rel_query = db.query(Relationship)
    if up_to_timestamp:
        rel_query = rel_query.filter(Relationship.timestamp <= up_to_timestamp)
    relationships = rel_query.all()

    # 2. Fetch security alerts to mark suspicious nodes
    alert_query = db.query(SecurityAlert)
    if up_to_timestamp:
        alert_query = alert_query.filter(SecurityAlert.timestamp <= up_to_timestamp)
    alerts = alert_query.all()

    suspicious_users: Set[str] = set()
    suspicious_sessions: Set[str] = set()
    suspicious_ips: Set[str] = set()

    for a in alerts:
        if a.user_id:
            suspicious_users.add(a.user_id)
        if a.session_id:
            suspicious_sessions.add(a.session_id)
        if a.ip:
            suspicious_ips.add(a.ip)

    # 3. Active sessions check
    session_query = db.query(SessionModel)
    if up_to_timestamp:
        # A session is active at T if created <= T and (ended_at is null or ended_at > T)
        session_query = session_query.filter(
            SessionModel.created_at <= up_to_timestamp,
            (SessionModel.ended_at == None) | (SessionModel.ended_at > up_to_timestamp)
        )
    else:
        session_query = session_query.filter(SessionModel.status == "active")
    active_session_ids = {s.session_id for s in session_query.all()}

    # 4. User details map
    user_map = {u.user_id: u for u in db.query(User).all()}

    nodes: Dict[str, GraphNode] = {}
    edges: List[GraphEdge] = []

    # Always include SERVER root node
    nodes["SERVER"] = GraphNode(
        data=GraphNodeData(
            id="SERVER",
            label="CENTRAL SERVER",
            type="SERVER",
            status="normal",
            properties={"role": "Enterprise Backend", "health": "ONLINE"}
        )
    )

    for r in relationships:
        s_node_id = f"{r.source_type.lower()}_{r.source_id}" if r.source_type != "SERVER" else "SERVER"
        t_node_id = f"{r.target_type.lower()}_{r.target_id}"

        # Source node creation
        if s_node_id not in nodes:
            status = "normal"
            label = r.source_id
            if r.source_type == "USER":
                user_obj = user_map.get(r.source_id)
                label = f"{user_obj.name} ({r.source_id})" if user_obj else r.source_id
                if r.source_id in suspicious_users:
                    status = "critical"
                elif any(r.source_id == s.user_id for s in session_query.all()):
                    status = "active"
                else:
                    status = "inactive"

            nodes[s_node_id] = GraphNode(
                data=GraphNodeData(
                    id=s_node_id,
                    label=label,
                    type=r.source_type,
                    status=status,
                    properties={"raw_id": r.source_id}
                )
            )

        # Target node creation
        if t_node_id not in nodes:
            status = "normal"
            label = r.target_id
            if r.target_type == "USER":
                user_obj = user_map.get(r.target_id)
                label = f"{user_obj.name} ({r.target_id})" if user_obj else r.target_id
                if r.target_id in suspicious_users:
                    status = "critical"
                elif any(r.target_id == s.user_id for s in session_query.all()):
                    status = "active"
                else:
                    status = "inactive"
            elif r.target_type == "SESSION":
                if r.target_id in suspicious_sessions:
                    status = "warning"
                elif r.target_id in active_session_ids:
                    status = "active"
                else:
                    status = "inactive"
            elif r.target_type == "IP":
                if r.target_id in suspicious_ips:
                    status = "warning"
            elif r.target_type == "RESOURCE":
                if "config" in r.target_id.lower() or "secret" in r.target_id.lower():
                    status = "warning"

            nodes[t_node_id] = GraphNode(
                data=GraphNodeData(
                    id=t_node_id,
                    label=label,
                    type=r.target_type,
                    status=status,
                    properties={"raw_id": r.target_id}
                )
            )

        # Edge creation
        edge_status = "normal"
        if (nodes[s_node_id].data.status in ["critical", "warning"] or 
            nodes[t_node_id].data.status in ["critical", "warning"]):
            edge_status = "warning"

        edge_id = f"e_{s_node_id}_{t_node_id}_{r.relation_type}"
        edges.append(
            GraphEdge(
                data=GraphEdgeData(
                    id=edge_id,
                    source=s_node_id,
                    target=t_node_id,
                    label=r.relation_type,
                    status=edge_status,
                    properties={"timestamp": r.timestamp.isoformat()}
                )
            )
        )

    return GraphDataOut(nodes=list(nodes.values()), edges=edges)
