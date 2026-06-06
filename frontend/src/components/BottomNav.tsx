import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";
import { CartIcon, GridIcon, HeartIcon, HomeIcon, SearchIcon, UserIcon } from "./Icons";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../lib/queryKeys";
import * as cartService from "../services/cart";

export function BottomNav({ onCartOpen }: { onCartOpen: () => void }) {
  const { token } = useAuth();
  const { wishlist } = useWishlist();
  const isSignedIn = Boolean(token);
  const wishlistCount = wishlist.size;

  const { data: cartData } = useQuery({
    queryKey: queryKeys.cart(),
    queryFn: cartService.getCart,
    enabled: isSignedIn,
    staleTime: 30_000,
  });
  const cartCount = cartData?.items?.reduce((sum, i) => sum + i.quantity, 0) ?? 0;

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] font-medium transition-colors ${
      isActive ? "text-emerald-600 dark:text-emerald-400" : "text-ink3"
    }`;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-stroke bg-page/95 px-2 py-2 backdrop-blur-md md:hidden"
      aria-label="Mobile navigation"
    >
      <NavLink to="/" end className={linkClass}>
        <HomeIcon className="size-5" />
        Home
      </NavLink>

      <NavLink to="/products" className={linkClass}>
        <GridIcon className="size-5" />
        Shop
      </NavLink>

      <NavLink to="/search" className={linkClass}>
        <SearchIcon className="size-5" />
        Search
      </NavLink>

      {isSignedIn ? (
        <>
          <NavLink to="/wishlist" className={linkClass}>
            <span className="relative">
              <HeartIcon className="size-5" filled={wishlistCount > 0} />
              {wishlistCount > 0 && (
                <span className="absolute -right-1 -top-1 flex size-[14px] items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">
                  {wishlistCount > 9 ? "9+" : wishlistCount}
                </span>
              )}
            </span>
            Wishlist
          </NavLink>

          <button
            type="button"
            onClick={onCartOpen}
            className="relative flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] font-medium text-ink3"
          >
            <span className="relative">
              <CartIcon className="size-5" />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex size-[14px] items-center justify-center rounded-full bg-emerald-500 text-[8px] font-bold text-white">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </span>
            Cart
          </button>
        </>
      ) : (
        <>
          <NavLink to="/login" className={linkClass}>
            <HeartIcon className="size-5" />
            Wishlist
          </NavLink>
          <NavLink to="/login" className={linkClass}>
            <CartIcon className="size-5" />
            Cart
          </NavLink>
        </>
      )}

      <NavLink to={isSignedIn ? "/account/profile" : "/login"} className={linkClass}>
        <UserIcon className="size-5" />
        Account
      </NavLink>
    </nav>
  );
}
