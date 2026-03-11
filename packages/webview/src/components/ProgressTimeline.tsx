import type { ProgressLog } from "@agent-board/shared";
import { formatRelativeTime } from "../utils/formatRelativeTime";

interface ProgressTimelineProps {
  logs: ProgressLog[];
  loading: boolean;
}

const TYPE_LABELS: Record<string, { icon: string; label: string }> = {
  started: { icon: "\u25B6", label: "\uC2DC\uC791" },
  completed: { icon: "\u2713", label: "\uC644\uB8CC" },
  blocked: { icon: "\u26A0", label: "\uCC28\uB2E8" },
  note: { icon: "\u270E", label: "\uBA54\uBAA8" },
};

export default function ProgressTimeline({ logs, loading }: ProgressTimelineProps) {
  if (loading) {
    return (
      <div className="timeline-empty">\uB85C\uB529 \uC911...</div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="timeline-empty">\uD65C\uB3D9 \uAE30\uB85D\uC774 \uC5C6\uC2B5\uB2C8\uB2E4</div>
    );
  }

  return (
    <div className="timeline">
      {logs.map((log) => {
        const info = TYPE_LABELS[log.type] ?? { icon: "\u2022", label: log.type };
        return (
          <div key={log.id} className="timeline-item">
            <div className="timeline-marker">
              <span className={`timeline-icon timeline-icon--${log.type}`}>
                {info.icon}
              </span>
            </div>
            <div className="timeline-content">
              <div className="timeline-header">
                <span className="timeline-label">{info.label}</span>
                {log.agent_id && (
                  <span className="timeline-agent">@{log.agent_id}</span>
                )}
                <span className="timeline-time">{formatRelativeTime(log.created_at)}</span>
              </div>
              {log.content && (
                <p className="timeline-text">{log.content}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
