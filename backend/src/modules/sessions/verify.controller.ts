import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { CertificateView, SessionsService } from './sessions.service';

/**
 * Ommaviy bayonnoma/sertifikat verifikatsiyasi (qaror §4).
 * Auth'siz, IP bo'yicha rate-limit bilan; faqat minimal ma'lumot; topilmasa 404.
 */
@ApiTags('verify')
@Controller('verify')
export class VerifyController {
  constructor(private readonly sessions: SessionsService) {}

  @Public()
  @UseGuards(RateLimitGuard)
  @RateLimit(30, 60)
  @Get(':uid')
  @ApiOperation({ summary: 'Bayonnoma haqiqiyligini tekshirish (QR)' })
  @ApiResponse({ status: 200, description: 'F.I.Sh., test nomi, sana, foiz, o‘tdi/o‘tmadi' })
  @ApiResponse({ status: 404, description: 'Bayonnoma topilmadi' })
  @ApiResponse({ status: 429, description: 'So‘rovlar soni chegaradan oshdi' })
  verify(@Param('uid') uid: string): Promise<CertificateView> {
    return this.sessions.verifyCertificate(uid);
  }
}
