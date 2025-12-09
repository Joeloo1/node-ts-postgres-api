import bcrypt from 'bcryptjs';
import crypto from "crypto";


export const hashPassword = async ( password: string): Promise<string> =>{
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password,salt)
}

export const comparePassword = async( plainPasword: string, hashedPassword: string) : Promise<boolean> => {
  return await bcrypt.compare(plainPasword, hashedPassword)
}

export const changePasswordAfter = (passwordChangeAt: Date | null, JWTTimestamp: number):boolean =>  {
  if (!passwordChangeAt) return false; 

  const changedTimestamp = Math.floor(passwordChangeAt.getTime() / 1000);

  return JWTTimestamp < changedTimestamp;
     
 };

// Generating password reset token 
 export const createPasswordResetToken  =  () => {
    const passwordResetToken = crypto.randomBytes(32).toString('hex');

  // hash the reset token 
   const resetToken = crypto
            .createHash('sha256')
            .update(passwordResetToken)
            .digest('hex');

  const resetTokenExpiry = new Date(Date.now() + 10 * 60 * 1000);

  return {
    passwordResetToken,
    resetToken,
    resetTokenExpiry,
  } 
}
