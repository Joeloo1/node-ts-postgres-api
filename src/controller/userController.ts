import { Request, Response, NextFunction, Router } from "express";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/AppError";
import { prisma } from "../config/database";
import { updateUserSchema } from "../Schema/userSchema";
import { User } from "@prisma/client";
import { filterObj } from "../utils/filterObj"; 



declare global {
  namespace Express {
    interface Request {
      user?: User; 
    }
  }
};

// update user 
export const updateMe = catchAsync(async(req: Request, res: Response, next: NextFunction) => {
  if (!req.user || !req.user.id) {
    return next(new AppError('You are not logged in', 401))
  };

  if (req.body.password || req.body.passwordConfirm) {
    return next(new AppError(
      'This route is not for password updates, Please use /updateMyPassword',
      400
    ))
  }

  const userData= updateUserSchema.parse(req.body);


  const filteredBody = filterObj(userData, 'name', 'email', 'phoneNumber' );
  if (req.file) {
    filteredBody.profileImage = req.file.filename
  }

  // Ensure at least one field is provided
  if (Object.keys(filteredBody).length === 0) {
    return next(
      new AppError(
        'Provide at least one valid field to update (name, email, phoneNumber, profileImage).',
        400
      )
    );
  };

  // Update user
  const updatedUser = await prisma.user.update({
    where: { id: req.user.id },
    data: filteredBody,
    
  });

  res.status(200).json({
    status: 'success',
    message: 'User updated successfully',
    user: updatedUser
  });
});

// get Me 
export const getMe = catchAsync(async(req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('You are not logged in', 401))
  };

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
  })

  if (!user) {
    return next(new AppError('User not found', 404))
  };

  res.status(200).json({
    status: 'success',
    data:user
  })
});

// delete Me 
 export const deleteMe = catchAsync(async(req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('You are not logged in', 401))
  };

  await prisma.user.update({
    where: { id: req.user.id },
    data: { active: false },
  });

  res.status(200).json({
    status: 'success',
    data: null
  })
}); 

// get all the user 
export const getAllUsers = catchAsync(async(req: Request, res: Response, next: NextFunction) => {
  const users = await prisma.user.findMany();

  res.status(200).json({
    status: 'success',
    results: users.length,
    data: {
      users
    }
  })
});

// get user
export const getUser = catchAsync(async(req: Request, res: Response, next: NextFunction) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id}
  });

  if (!user) {
    return next(new AppError(
      'There is no user with the ID', 404
    ));
  };

  res.status(200).json({
    status: 'success',
    data: { user }
  })
}); 

// create user
export const createUser = (req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not defined! Please use /Signup instead'
  })
};

// update user 
export const updateUser = catchAsync(async(req: Request, res: Response, next: NextFunction) => {
  const { name, email, roles } = (req.body);

  const updatedUser = await prisma.user.update({
    where: {id: req.params.id },
    data: { name, email, roles }
  });

  if (!updateUser) {
    return next(new AppError('No user found with this ID', 404))
  }

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser
    }
  })
});

// delete user 
 export const deleteUser = catchAsync(async(req: Request, res: Response, next: NextFunction) => {
   await prisma.user.delete({
    where: { id: req.params.id }
  });

  res.status(204).json({
    status: 'success',
    data : null
  })
})
