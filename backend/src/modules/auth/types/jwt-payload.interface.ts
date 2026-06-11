import { UserRole } from '../../../common/enums/user-role.enum';

/** Access JWT ichidagi ma'lumot. */
export interface JwtPayload {
  sub: string; // user id
  login: string | null;
  role: UserRole;
}
