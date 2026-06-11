/** Sessiya holati — `session_status` pg enum bilan mos. */
export enum SessionStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
  TERMINATED = 'terminated',
  CANCELLED = 'cancelled',
}
