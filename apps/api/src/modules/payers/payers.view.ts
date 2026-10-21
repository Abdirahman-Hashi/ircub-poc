import type { DuplicateFlagResponseDto } from './dto/duplicate-flag.response.dto';
import type { PayerResponseDto } from './dto/payer.response.dto';
import type { DuplicateFlagWithPayers } from './payers.types';
import type { Payer } from '@prisma/client';

export function toPayerView(payer: Payer): PayerResponseDto {
  return {
    id: payer.id,
    tin: payer.tin,
    type: payer.type,
    name: payer.name,
    nationalId: payer.nationalId,
    registrationNo: payer.registrationNo,
    phone: payer.phone,
    email: payer.email,
    address: payer.address,
    status: payer.status,
    createdAt: payer.createdAt,
  };
}

export function toDuplicateFlagView(flag: DuplicateFlagWithPayers): DuplicateFlagResponseDto {
  return {
    id: flag.id,
    payer: toPayerView(flag.payer),
    matchedPayer: toPayerView(flag.matchedPayer),
    matchField: flag.matchField,
    status: flag.status,
    note: flag.note,
    reviewedAt: flag.reviewedAt,
    createdAt: flag.createdAt,
  };
}
