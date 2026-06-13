export type Category = {
  category_id: number;
  name: string;
};

export type Product = {
  product_id: string;
  name: string;
  description: string | null;
  price: number;
  unit: string | null;
  image: string | null;
  images?: string[] | null;
  discount: number | null;
  stock?: number;
  availability: boolean;
  brand: string | null;
  rating: number | null;
  category_id: number | null;
  category?: { category_id: number; name: string } | { name: string };
  createdAt?: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  roles: string;
  phoneNumber?: string | null;
  profileImage?: string;
  isVerified?: boolean;
  createdAt?: string;
  orderCount?: number;
};

export type CartItem = {
  id: string;
  product_id: string;
  quantity: number;
  product: Product;
};

export type Cart = {
  id: string;
  items: CartItem[];
};

export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";

export type OrderItem = {
  id: string;
  product_id: string;
  quantity: number;
  price: number;
  product?: {
    name: string;
    image: string | null;
    images?: string[] | null;
  };
};

export type Order = {
  id: string;
  userId: string;
  status: OrderStatus;
  total: number;
  items: OrderItem[];
  createdAt: string;
  cancelledAt?: string | null;
  shippingAddress?: {
    street: string;
    city: string;
    state?: string | null;
    zipCode?: string | null;
    country?: string | null;
  } | null;
  paymentMethod?: (
    | { type: "card"; brand: string; last4: string }
    | { type: "paypal"; email: string }
  ) | null;
  trackingNumber?: string | null;
  trackingCarrier?: string | null;
};

export type Address = {
  id: string;
  street: string;
  city: string;
  state: string | null;
  zipCode: string | null;
  country: string | null;
  isDefault: boolean;
};

export type Review = {
  id: string;
  product_id: string;
  rating: number;
  content: string | null;
  userId: string;
  verifiedPurchase?: boolean;
  user?: { id: string; name: string; email: string };
  votes?: { helpful: boolean }[];
  createdAt: string;
};

export type ProductVariant = {
  id: string;
  product_id: string;
  name: string;
  priceModifier: number;
  stock: number;
  availability: boolean;
  createdAt: string;
};

export type ProductAnswer = {
  id: string;
  questionId: string;
  userId: string;
  user?: { id: string; name: string };
  answer: string;
  createdAt: string;
};

export type ProductQuestion = {
  id: string;
  product_id: string;
  userId: string;
  user?: { id: string; name: string };
  question: string;
  answers: ProductAnswer[];
  createdAt: string;
};

export type PriceHistoryPoint = {
  price: number;
  createdAt: string;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};
