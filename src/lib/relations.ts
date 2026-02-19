import type { Function, Person, Role, Shift } from '../types';

export const buildFunctionMap = (functions: Function[]) => new Map(functions.map((fn) => [fn.id, fn]));
export const buildPersonMap = (people: Person[]) => new Map(people.map((person) => [person.id, person]));
export const buildRoleMap = (roles: Role[]) => new Map(roles.map((role) => [role.id, role]));

export const getShiftFunction = (shift: Shift, peopleById: Map<string, Person>, functionsById: Map<string, Function>) => {
  const person = peopleById.get(shift.personId);
  if (!person) return undefined;
  const firstRoleFunction = Array.from(functionsById.values()).find((fn) => fn.roleId === person.roleId);
  return firstRoleFunction;
};

export const getShiftRole = (
  shift: Shift,
  peopleById: Map<string, Person>,
  functionsById: Map<string, Function>,
  rolesById: Map<string, Role>
) => {
  const fn = getShiftFunction(shift, peopleById, functionsById);
  if (!fn) return undefined;
  return rolesById.get(fn.roleId);
};
