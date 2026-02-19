import type { Function, Person, Role, Shift } from '../types';

export const buildFunctionMap = (functions: Function[]) => new Map(functions.map((fn) => [fn.id, fn]));
export const buildPersonMap = (people: Person[]) => new Map(people.map((person) => [person.id, person]));
export const buildRoleMap = (roles: Role[]) => new Map(roles.map((role) => [role.id, role]));

export const getShiftFunction = (_shift: Shift, _peopleById: Map<string, Person>, _functionsById: Map<string, Function>) => undefined;

export const getShiftRole = (
  _shift: Shift,
  _peopleById: Map<string, Person>,
  _functionsById: Map<string, Function>,
  _rolesById: Map<string, Role>
) => undefined;
