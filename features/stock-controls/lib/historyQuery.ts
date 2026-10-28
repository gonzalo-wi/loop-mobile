const SEES_ALL_ROLES = ['ADMIN', 'SUPERVISOR'];
const HISTORY_PAGE_SIZE = 100;

export type HistoryQuery = {
  createdFrom: string;
  createdTo: string;
  controllerId?: string;
  size: number;
};

export function seesAllControls(role: string): boolean {
  return SEES_ALL_ROLES.includes(role);
}

/**
 * Filters by creation day instead of control date: exits are created today for the next
 * delivery day, and operators need to review what they just created. The backend also
 * forces CONTROLADOR to their own controls; sending controllerId keeps both sides aligned.
 */
export function buildHistoryQuery(user: { id: string; role: string }, today: string): HistoryQuery {
  return {
    createdFrom: today,
    createdTo: today,
    size: HISTORY_PAGE_SIZE,
    ...(seesAllControls(user.role) ? {} : { controllerId: user.id }),
  };
}
