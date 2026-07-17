export type TransitionTable<TState extends string, TRole extends string> = Record<
  TState,
  Partial<Record<TRole, TState[]>>
>;

export function canTransition<TState extends string, TRole extends string>(
  table: TransitionTable<TState, TRole>,
  from: TState,
  to: TState,
  role: TRole
): boolean {
  const allowedDestinations = table[from]?.[role];
  return allowedDestinations?.includes(to) ?? false;
}

export function allowedTransitionsFrom<TState extends string, TRole extends string>(
  table: TransitionTable<TState, TRole>,
  from: TState,
  role: TRole
): TState[] {
  return table[from]?.[role] ?? [];
}