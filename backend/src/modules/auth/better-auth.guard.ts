import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';

@Injectable()
export class BetterAuthGuard implements CanActivate {
  constructor(@Inject('BETTER_AUTH') private readonly auth: any) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<any>();

    const session = await this.auth.api.getSession({
      headers: request.headers as Headers,
    });

    if (!session) {
      throw new UnauthorizedException('Invalid session');
    }

    request.user = (session as any).user;
    request.session = (session as any).session;

    return true;
  }
}
