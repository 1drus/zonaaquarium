import { z } from 'zod';

export const registerSchema = z.object({
  fullName: z.string()
    .trim()
    .min(2, { message: 'Nama minimal 2 karakter' })
    .max(100, { message: 'Nama maksimal 100 karakter' }),
  email: z.string()
    .trim()
    .email({ message: 'Email tidak valid' })
    .max(255, { message: 'Email maksimal 255 karakter' }),
  phone: z.string()
    .trim()
    .min(10, { message: 'Nomor telepon minimal 10 digit' })
    .max(15, { message: 'Nomor telepon maksimal 15 digit' })
    .regex(/^[0-9+\-\s()]*$/, { message: 'Nomor telepon tidak valid' }),
  password: z.string()
    .min(8, { message: 'Password minimal 8 karakter' })
    .max(100, { message: 'Password maksimal 100 karakter' }),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Password tidak cocok',
  path: ['confirmPassword']
});

export const loginSchema = z.object({
  email: z.string()
    .trim()
    .email({ message: 'Email tidak valid' }),
  password: z.string()
    .min(1, { message: 'Password harus diisi' })
});

export const resetPasswordSchema = z.object({
  email: z.string()
    .trim()
    .email({ message: 'Email tidak valid' })
});

export const profileSchema = z.object({
  fullName: z.string()
    .trim()
    .min(2, { message: 'Nama minimal 2 karakter' })
    .max(100, { message: 'Nama maksimal 100 karakter' }),
  phone: z.string()
    .trim()
    .min(10, { message: 'Nomor telepon minimal 10 digit' })
    .max(15, { message: 'Nomor telepon maksimal 15 digit' })
    .regex(/^[0-9+\-\s()]*$/, { message: 'Nomor telepon tidak valid' })
    .optional()
    .or(z.literal('')),
  bio: z.string()
    .max(500, { message: 'Bio maksimal 500 karakter' })
    .optional()
    .or(z.literal(''))
});

export const addressSchema = z.object({
  label: z.string()
    .trim()
    .min(2, { message: 'Label minimal 2 karakter' })
    .max(50, { message: 'Label maksimal 50 karakter' }),
  recipientName: z.string()
    .trim()
    .min(2, { message: 'Nama penerima minimal 2 karakter' })
    .max(100, { message: 'Nama penerima maksimal 100 karakter' }),
  phone: z.string()
    .trim()
    .min(10, { message: 'Nomor telepon minimal 10 digit' })
    .max(15, { message: 'Nomor telepon maksimal 15 digit' })
    .regex(/^[0-9+\-\s()]*$/, { message: 'Nomor telepon tidak valid' }),
  addressLine: z.string()
    .trim()
    .min(10, { message: 'Alamat minimal 10 karakter' })
    .max(255, { message: 'Alamat maksimal 255 karakter' }),
  kelurahan: z.string()
    .trim()
    .min(2, { message: 'Kelurahan minimal 2 karakter' })
    .max(100, { message: 'Kelurahan maksimal 100 karakter' }),
  kecamatan: z.string()
    .trim()
    .min(2, { message: 'Kecamatan minimal 2 karakter' })
    .max(100, { message: 'Kecamatan maksimal 100 karakter' }),
  city: z.string()
    .trim()
    .min(2, { message: 'Kota minimal 2 karakter' })
    .max(100, { message: 'Kota maksimal 100 karakter' }),
  province: z.string()
    .trim()
    .min(2, { message: 'Provinsi minimal 2 karakter' })
    .max(100, { message: 'Provinsi maksimal 100 karakter' }),
  postalCode: z.string()
    .trim()
    .length(5, { message: 'Kode pos harus 5 digit' })
    .regex(/^[0-9]+$/, { message: 'Kode pos harus berupa angka' }),
  isDefault: z.boolean().default(false)
});

// OTP verification schema
export const otpVerificationSchema = z.object({
  email: z.string().email({ message: "Email tidak valid" }),
  code: z.string()
    .length(6, { message: 'Kode harus 6 digit' })
    .regex(/^[0-9]+$/, { message: 'Kode harus berupa angka' })
});

export type RegisterFormData = z.infer<typeof registerSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;
export type AddressFormData = z.infer<typeof addressSchema>;
export type OTPVerificationData = z.infer<typeof otpVerificationSchema>;
