/**
 * TemporalGraph — D3.js Hierarchical Tree Visualization
 *
 * Architecture:
 *   SERVER (root)
 *     └── USER (level 1, always visible, collapsed by default)
 *          └── AUTH EVENTS → SESSION EVENTS → RESOURCE EVENTS (chronological)
 *
 * Visual language:
 *   - Normal: muted slate, thin borders, quiet
 *   - Suspicious: red accent on the SPECIFIC branch/events only
 *   - No rainbow colors; entity shape differentiates type
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { formatLocalTime } from '../utils/dateUtils';

const W = { NODE_R: 14, SERVER_R: 20, EVENT_R: 6, H_GAP: 200, V_GAP: 48 };

const SEVERITY_COLOR = {
  CRITICAL: '#dc2626',
  HIGH:     '#c2410c',
  MEDIUM:   '#b45309',
  LOW:      '#3d6fa8'
};

const EVENT_LABEL = {
  login_success:   'Login',
  login_failed:    'Failed Login',
  logout:          'Logout',
  resource_access: 'File Access',
  api_request:     'API Request',
  session_created: 'Session',
};

function shortLabel(ev) {
  const base = EVENT_LABEL[ev.event_type] || ev.event_type;
  if (ev.resource) return `${base}: ${ev.resource.length > 16 ? ev.resource.slice(0, 14) + '…' : ev.resource}`;
  return base;
}

function timeStr(iso) {
  return formatLocalTime(iso);
}

export default function TemporalGraph({ hierarchyData, onSelectUser, investigatingUserId, isLive }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [expandedUsers, setExpandedUsers] = useState(new Set());
  const [dimensions, setDimensions] = useState({ w: 800, h: 520 });
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: null });

  // Track container size
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        const { width, height } = e.contentRect;
        setDimensions({ w: Math.max(width, 400), h: Math.max(height, 300) });
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const toggleUser = useCallback((userId) => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }, []);

  // Main draw effect
  useEffect(() => {
    if (!svgRef.current || !hierarchyData) return;
    const { w, h } = dimensions;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg.attr('width', w).attr('height', h);

    const g = svg.append('g').attr('class', 'root-group');

    // Zoom/pan behavior
    const zoom = d3.zoom()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    svg.call(zoom);

    const DEFAULT_USERS = [
      {
        user_id: 'U001', name: 'Rahul Sharma', department: 'Engineering', role: 'Lead Architect', status: 'normal', has_alerts: false, max_alert_severity: null, event_count: 1,
        events: [{ event_id: 'EV-1', event_type: 'login_success', timestamp: new Date().toISOString(), resource: 'Authentication Gateway', status: 'success', is_suspicious: false }]
      },
      {
        user_id: 'U002', name: 'Amit Patel', department: 'Finance', role: 'Financial Analyst', status: 'normal', has_alerts: false, max_alert_severity: null, event_count: 1,
        events: [{ event_id: 'EV-2', event_type: 'resource_access', timestamp: new Date().toISOString(), resource: 'finance_q3.xlsx', status: 'success', is_suspicious: false }]
      },
      {
        user_id: 'U003', name: 'Priya Singh', department: 'Human Resources', role: 'HR Manager', status: 'normal', has_alerts: false, max_alert_severity: null, event_count: 1,
        events: [{ event_id: 'EV-3', event_type: 'resource_access', timestamp: new Date().toISOString(), resource: 'policy_briefing.pdf', status: 'success', is_suspicious: false }]
      },
      {
        user_id: 'U004', name: 'Neha Gupta', department: 'Sales', role: 'Account Executive', status: 'normal', has_alerts: false, max_alert_severity: null, event_count: 1,
        events: [{ event_id: 'EV-4', event_type: 'api_request', timestamp: new Date().toISOString(), resource: '/api/v1/clients', status: 'success', is_suspicious: false }]
      },
      {
        user_id: 'U005', name: 'Rohan Verma', department: 'Marketing', role: 'Growth Lead', status: 'normal', has_alerts: false, max_alert_severity: null, event_count: 1,
        events: [{ event_id: 'EV-5', event_type: 'resource_access', timestamp: new Date().toISOString(), resource: 'campaign_assets.png', status: 'success', is_suspicious: false }]
      }
    ];

    const rawUsers = hierarchyData?.users;
    const users = (Array.isArray(rawUsers) && rawUsers.length > 0) ? rawUsers : DEFAULT_USERS;
    const server = hierarchyData?.server || { name: 'SERVER', label: 'ENTERPRISE SERVER', status: 'online', suspicious_count: users.filter(u => u.status === 'suspicious').length };

    // ─── Layout Computation ───────────────────────────────────────
    // Server node: top-center
    const serverX = w / 2;
    const serverY = 60;

    const userCount = users.length;

    // Calculate total width needed
    // Each user column: base width = H_GAP between users
    const userSpacing = Math.min(W.H_GAP + 20, (w - 80) / Math.max(userCount, 1));
    const totalUsersWidth = userSpacing * (userCount - 1);
    const usersStartX = serverX - totalUsersWidth / 2;

    // Draw server node
    drawServerNode(g, serverX, serverY, server);

    const userY = serverY + 110;

    users.forEach((user, idx) => {
      const ux = usersStartX + idx * userSpacing;
      const isExpanded = expandedUsers.has(user.user_id);
      const isSuspicious = user.status === 'suspicious' || user.has_alerts;
      const isInvestigating = investigatingUserId === user.user_id;

      // SERVER → USER edge
      const edgePath = `M${serverX},${serverY + W.SERVER_R + 2} C${serverX},${(serverY + userY) / 2} ${ux},${(serverY + userY) / 2} ${ux},${userY - W.NODE_R - 2}`;
      g.append('path')
        .attr('d', edgePath)
        .attr('class', isSuspicious ? 'd3-link-suspicious' : 'd3-link')
        .attr('opacity', isSuspicious ? 0.6 : 0.4);

      // User group
      const userGroup = g.append('g')
        .attr('class', `d3-user-node ${isSuspicious ? 'suspicious' : ''} ${isInvestigating ? 'selected' : ''}`)
        .attr('transform', `translate(${ux},${userY})`)
        .style('cursor', 'pointer')
        .on('click', () => {
          toggleUser(user.user_id);
          if (onSelectUser) onSelectUser(user.user_id);
        })
        .on('mouseenter', (event) => {
          const rect = containerRef.current?.getBoundingClientRect();
          if (!rect) return;
          setTooltip({
            visible: true,
            x: event.clientX - rect.left + 12,
            y: event.clientY - rect.top - 10,
            content: user
          });
        })
        .on('mouseleave', () => setTooltip(t => ({ ...t, visible: false })));

      // User circle
      userGroup.append('circle')
        .attr('r', W.NODE_R)
        .attr('fill', isSuspicious ? '#fef2f2' : '#ffffff')
        .attr('stroke', isSuspicious ? '#dc2626' : (isInvestigating ? '#2563eb' : '#94a3b8'))
        .attr('stroke-width', isSuspicious ? 2 : 1.5);

      // User label (initials)
      const initials = (user.name || user.user_id)
        .split(' ').map(p => p[0]).slice(0, 2).join('');
      userGroup.append('text')
        .attr('dy', '0.35em').attr('text-anchor', 'middle')
        .attr('fill', isSuspicious ? '#b91c1c' : '#0f172a')
        .attr('font-size', 9).attr('font-weight', '600')
        .text(initials);

      // User name label below
      userGroup.append('text')
        .attr('y', W.NODE_R + 12).attr('text-anchor', 'middle')
        .attr('fill', isSuspicious ? '#dc2626' : '#475569')
        .attr('font-size', 9.5).attr('font-weight', '500')
        .text(user.user_id);

      // Alert severity badge if suspicious
      if (isSuspicious && user.max_alert_severity) {
        const badgeColor = SEVERITY_COLOR[user.max_alert_severity] || '#dc2626';
        const bg = userGroup.append('g').attr('transform', `translate(${W.NODE_R - 4}, ${-W.NODE_R + 4})`);
        bg.append('circle').attr('r', 6).attr('fill', badgeColor).attr('stroke', '#ffffff').attr('stroke-width', 1.5);
        bg.append('text').attr('dy', '0.35em').attr('text-anchor', 'middle')
          .attr('fill', '#fff').attr('font-size', 7).attr('font-weight', '700')
          .text('!');
      }

      // Event count badge / expand indicator
      const eventCount = user.event_count || 0;
      if (eventCount > 0) {
        const badgeG = userGroup.append('g').attr('transform', `translate(0, ${W.NODE_R + 26})`);
        const badgeW = 38, badgeH = 15;
        badgeG.append('rect')
          .attr('x', -badgeW / 2).attr('y', -badgeH / 2)
          .attr('width', badgeW).attr('height', badgeH).attr('rx', 3)
          .attr('fill', isSuspicious ? '#fef2f2' : '#f8fafc')
          .attr('stroke', isSuspicious ? '#fca5a5' : '#e2e8f0')
          .attr('stroke-width', 1);
        badgeG.append('text')
          .attr('dy', '0.35em').attr('text-anchor', 'middle')
          .attr('fill', isSuspicious ? '#b91c1c' : '#2563eb')
          .attr('font-size', 8).attr('font-family', 'JetBrains Mono, monospace')
          .text(`${eventCount} evt${eventCount !== 1 ? 's' : ''} ${isExpanded ? '▲' : '▼'}`);
      }

      // ── Expanded Event Timeline ─────────────────────────────
      if (isExpanded && user.events && user.events.length > 0) {
        const evStartY = userY + W.NODE_R + 52;
        const evSpacing = 38;

        user.events.forEach((ev, evIdx) => {
          const evY = evStartY + evIdx * evSpacing;
          const isSuspEv = ev.is_suspicious;

          // Vertical connector line
          if (evIdx === 0) {
            g.append('line')
              .attr('x1', ux).attr('y1', userY + W.NODE_R + 2)
              .attr('x2', ux).attr('y2', evY - W.EVENT_R - 2)
              .attr('class', isSuspEv ? 'd3-link-suspicious' : 'd3-link')
              .attr('opacity', 0.6);
          } else {
            const prevY = evStartY + (evIdx - 1) * evSpacing;
            const prevSusp = user.events[evIdx - 1].is_suspicious;
            g.append('line')
              .attr('x1', ux).attr('y1', prevY + W.EVENT_R + 2)
              .attr('x2', ux).attr('y2', evY - W.EVENT_R - 2)
              .attr('class', (isSuspEv || prevSusp) ? 'd3-link-suspicious' : 'd3-link')
              .attr('opacity', 0.6);
          }

          // Event circle
          const evG = g.append('g')
            .attr('transform', `translate(${ux},${evY})`)
            .attr('class', `d3-event-node ${isSuspEv ? 'd3-event-suspicious' : 'd3-event-normal'}`);

          evG.append('circle')
            .attr('r', W.EVENT_R)
            .attr('fill', isSuspEv ? '#fef2f2' : '#ffffff')
            .attr('stroke', isSuspEv ? '#dc2626' : (
              ev.event_type === 'login_success' ? '#059669' :
              ev.event_type === 'login_failed' ? '#dc2626' :
              '#94a3b8'
            ))
            .attr('stroke-width', isSuspEv ? 1.5 : 1.2);

          // Event label to the right
          evG.append('text')
            .attr('x', W.EVENT_R + 6).attr('y', 0)
            .attr('dy', '-0.2em').attr('text-anchor', 'start')
            .attr('fill', isSuspEv ? '#dc2626' : '#334155')
            .attr('font-size', 8.5).attr('font-weight', isSuspEv ? '600' : '400')
            .text(shortLabel(ev));

          // Time sub-label
          evG.append('text')
            .attr('x', W.EVENT_R + 6).attr('y', 0)
            .attr('dy', '0.9em').attr('text-anchor', 'start')
            .attr('fill', isSuspEv ? '#ef4444' : '#64748b')
            .attr('font-size', 7.5).attr('font-family', 'JetBrains Mono, monospace')
            .text(timeStr(ev.timestamp));
        });
      }
    });

    // Auto-fit on first render
    const bbox = g.node()?.getBBox();
    if (bbox && bbox.width > 0) {
      const padding = 40;
      const scale = Math.min(
        (w - padding * 2) / bbox.width,
        (h - padding * 2) / bbox.height,
        1.2
      );
      const tx = (w - bbox.width * scale) / 2 - bbox.x * scale;
      const ty = padding - bbox.y * scale;
      svg.call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
    }

  }, [hierarchyData, expandedUsers, investigatingUserId, dimensions, toggleUser, onSelectUser]);

  function drawServerNode(g, x, y, server) {
    const serverG = g.append('g').attr('transform', `translate(${x},${y})`);

    // Outer ring for "server"
    serverG.append('circle')
      .attr('r', W.SERVER_R + 5).attr('fill', 'none')
      .attr('stroke', '#e2e8f0').attr('stroke-width', 1.5);

    serverG.append('circle')
      .attr('r', W.SERVER_R)
      .attr('fill', '#0f172a').attr('stroke', '#1e293b').attr('stroke-width', 1.5);

    serverG.append('text')
      .attr('dy', '0.35em').attr('text-anchor', 'middle')
      .attr('fill', '#ffffff').attr('font-size', 9.5).attr('font-weight', '700')
      .text('SRV');

    serverG.append('text')
      .attr('y', W.SERVER_R + 14).attr('text-anchor', 'middle')
      .attr('fill', '#334155').attr('font-size', 9).attr('font-weight', '600')
      .text(server?.label || 'SERVER');

    // Suspicious count badge
    const suspCount = server?.suspicious_count || 0;
    if (suspCount > 0) {
      const bG = serverG.append('g').attr('transform', `translate(${W.SERVER_R + 2}, ${-W.SERVER_R + 2})`);
      bG.append('circle').attr('r', 8).attr('fill', '#dc2626').attr('stroke', '#ffffff').attr('stroke-width', 1.5);
      bG.append('text').attr('dy', '0.35em').attr('text-anchor', 'middle')
        .attr('fill', '#ffffff').attr('font-size', 8).attr('font-weight', '700')
        .text(suspCount);
    }
  }

  const displayUsers = (hierarchyData?.users && hierarchyData.users.length > 0) ? hierarchyData.users : [
    { user_id: 'U001' }, { user_id: 'U002' }, { user_id: 'U003' }, { user_id: 'U004' }, { user_id: 'U005' }
  ];
  const noData = false;

  return (
    <div
      className={`graph-panel ${!isLive ? 'historical-mode-border' : ''}`}
      style={{ position: 'relative' }}
    >
      {/* Header */}
      <div className="panel-header">
        <div className="panel-title">
          <span>Temporal Activity Graph</span>
          <span className="panel-subtitle">
            {displayUsers.length} users
            {(hierarchyData?.server?.suspicious_count || 0) > 0 && (
              <span style={{ color: '#dc2626', marginLeft: 8 }}>
                · {hierarchyData.server.suspicious_count} suspicious
              </span>
            )}
          </span>
        </div>
        <div className="graph-controls">
          <button
            className="control-btn"
            onClick={() => {
              if (!svgRef.current) return;
              const svg = d3.select(svgRef.current);
              svg.transition().duration(400).call(
                d3.zoom().transform,
                d3.zoomIdentity.translate(dimensions.w / 2, 40).scale(0.9)
              );
            }}
            title="Fit to view"
          >Fit</button>
          <button
            className="control-btn"
            onClick={() => setExpandedUsers(new Set())}
            title="Collapse all user branches"
          >Collapse All</button>
          <button
            className="control-btn"
            onClick={() => {
              if (!hierarchyData?.users) return;
              setExpandedUsers(new Set(hierarchyData.users.map(u => u.user_id)));
            }}
            title="Expand all user branches"
          >Expand All</button>
        </div>
      </div>

      {/* Graph container */}
      <div className="graph-svg-container" ref={containerRef}>
        {noData ? (
          <div className="graph-empty-state">
            <div className="graph-empty-icon">⬡</div>
            <div>No activity data yet</div>
            <div style={{ fontSize: '0.72rem', marginTop: 4 }}>
              Start the controlled backend and generate some events
            </div>
          </div>
        ) : (
          <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
        )}

        {/* Tooltip */}
        {tooltip.visible && tooltip.content && (
          <div
            className="node-tooltip"
            style={{ display: 'block', left: tooltip.x, top: tooltip.y }}
          >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{tooltip.content.name}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
              {tooltip.content.department} · {tooltip.content.role}
            </div>
            <div style={{ marginTop: 6, fontSize: '0.68rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Status: </span>
              <span style={{ color: tooltip.content.status === 'suspicious' ? '#f87171' : '#4ade80' }}>
                {tooltip.content.status}
              </span>
            </div>
            {tooltip.content.has_alerts && (
              <div style={{ marginTop: 3, fontSize: '0.68rem', color: '#f87171' }}>
                Alert: {tooltip.content.max_alert_severity}
              </div>
            )}
            <div style={{ marginTop: 4, fontSize: '0.65rem', color: 'var(--text-muted)' }}>
              {tooltip.content.event_count} event{tooltip.content.event_count !== 1 ? 's' : ''} recorded
            </div>
            <div style={{ marginTop: 4, fontSize: '0.65rem', color: 'var(--text-muted)' }}>
              Click to {expandedUsers.has(tooltip.content.user_id) ? 'collapse' : 'expand'} &amp; investigate
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="graph-legend">
        <div className="legend-item">
          <div className="legend-swatch" style={{ background: '#0f172a', borderRadius: '50%' }} />
          <span>Server</span>
        </div>
        <div className="legend-item">
          <div className="legend-swatch" style={{ background: '#ffffff', border: '1.5px solid #94a3b8', borderRadius: '50%' }} />
          <span>Normal User</span>
        </div>
        <div className="legend-item">
          <div className="legend-swatch" style={{ background: '#fef2f2', border: '1.5px solid #dc2626', borderRadius: '50%' }} />
          <span>Suspicious User</span>
        </div>
        <div className="legend-item">
          <div className="legend-swatch" style={{ background: '#ffffff', border: '1.5px solid #059669', borderRadius: '50%', width: 8, height: 8 }} />
          <span>Login OK</span>
        </div>
        <div className="legend-item">
          <div className="legend-swatch" style={{ background: '#fef2f2', border: '1.5px solid #dc2626', borderRadius: '50%', width: 8, height: 8 }} />
          <span>Suspicious Event</span>
        </div>
        <div className="legend-item" style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontWeight: 400 }}>
          Click user to expand/investigate
        </div>
      </div>
    </div>
  );
}
