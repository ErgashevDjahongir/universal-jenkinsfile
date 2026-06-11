import { UserRole } from '../../../common/enums/user-role.enum';

/** req.user'ga biriktiriladigan minimal foydalanuvchi konteksti (JwtStrategy natijasi). */
export interface AuthUser {
  id: string;
  login: string | null;
  role: UserRole;
  firstName: string;
  lastName: string;
}
