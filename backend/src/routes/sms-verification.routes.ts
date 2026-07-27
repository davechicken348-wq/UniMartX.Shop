import { Router } from 'express';
import { sendSmsCode, verifySms, resendSmsCode } from '../controllers/sms-verification.controller';
import { validate } from '../middleware/validate';
import { sendSmsCodeSchema, verifySmsCodeSchema, resendSmsCodeSchema } from '../schemas/sms-verification.schema';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate } from '../controllers/auth.controller';

const router = Router();

router.post('/sms/send', validate(sendSmsCodeSchema), asyncHandler(sendSmsCode));
router.post('/sms/verify', authenticate, validate(verifySmsCodeSchema), asyncHandler(verifySms));
router.post('/sms/resend', validate(resendSmsCodeSchema), asyncHandler(resendSmsCode));

export default router;
