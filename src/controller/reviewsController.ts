import { Request, Response, NextFunction, Router } from "express";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/AppError";
import { createReviewSchema, updateReviewSchema } from "../Schema/reviewsSchema";
import { prisma } from "./../config/database";


// create review 
export const createReview = catchAsync(async(req: Request, res: Response, next: NextFunction) => {
  const userId = req.user!.id;
  const { product_id, rating, content } = createReviewSchema.parse(req.body)

  const existingReview = await prisma.review.findUnique({
    where: {
      userId_product_id: { userId, 
        product_id,
      },
    },
  });

  if (existingReview) { 
    return next(new AppError('You already reviewed this product', 400))
  };

  const review = await prisma.review.create({
    data: {
      userId,
      product_id,
      rating,
      content,
    }
  });

  res.status(200).json({
    status: 'success',
    data: {
      review
    }
  })
});

// Update review 
export const updateReview = catchAsync(async(req: Request, res: Response, next: NextFunction) => {
  const { content, rating } = req.body
  const review = await prisma.review.findUnique({
    where : { id : req.params.id },
  });

  if (!review || review.userId !== req.user!.id) {
    return next(new AppError('Review not found', 404));
  };

  const updatedReview = await prisma.review.update({
    where: { id: req.params.id },
    data: {
      content,
      rating
    }
  });

  res.status(201).json({
    status: "success",
    data: {
      updatedReview
    }
  })
});

// Get reviews for products 
export const getProductReview = catchAsync(async(req: Request, res: Response, next: NextFunction) => {
  const reviews = await prisma.review.findMany({
    where: { product_id: req.params.product_id },
    include: {
      user: { select: {id: true, name: true, email: true }},
    },
  });

  res.status(200).json({
    status: 'success',
    data: {
      reviews
    }
  });
});

// delete Review
export const deleteReview = catchAsync(async(req: Request, res: Response, next: NextFunction) => {
   const review = await prisma.review.findUnique({
       where : { id : req.params.id },
   });

   if (!review || review.userId !== req.user!.id) {
      return next(new AppError('Review not found', 404));
   };

  await prisma.review.delete({
    where: { id: req.params.id },
  });

  res.status(200).json({
    status: 'success',
    data: null
  })

})
