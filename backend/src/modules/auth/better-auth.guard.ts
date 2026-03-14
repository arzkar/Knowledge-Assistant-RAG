import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { auth } from './auth.instance';

@Injectable()
export class BetterAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<any>();

    // Better-Auth getSession expects headers
    const session = await auth.api.getSession({
      headers: request.headers as Headers,
    });

    if (!session) {
      throw new UnauthorizedException('Invalid session');
    }

    // Attach user and session to request for use in controllers
    request.user = (session as any).user;
    request.session = (session as any).session;

    return true;
  }
}
