// Single source for the mock identity until the auth backend lands.
// Everything personalized (sidebar, owners, workspace label) reads this.
export interface MockUser {
  name: string;
  initials: string;
  workspaceLabel: string;
}

export const mockUser: MockUser = {
  name: 'Nilangan Dutta',
  initials: 'N',
  workspaceLabel: "Nilangan's…",
};
