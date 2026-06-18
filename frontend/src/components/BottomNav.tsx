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
    `relative flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-semibold transition-all duration-200 ${
      isActive
        ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
        : "text-ink4 hover:text-ink3"
    }`;

  const ActiveDot = () => (
    <span className="absolute -top-0.5 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-emerald-500" />
  );

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-stroke/70 bg-card/80 px-2 py-1.5 backdrop-blur-xl md:hidden shadow-[0_-4px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.4)]"
      aria-label="Mobile navigation"
    >
      <NavLink to="/" end className={linkClass}>
        {({ isActive }) => (<>{isActive && <ActiveDot />}<HomeIcon className="size-5" />Home</>)}
      </NavLink>

      <NavLink to="/products" className={linkClass}>
        {({ isActive }) => (<>{isActive && <ActiveDot />}<GridIcon className="size-5" />Shop</>)}
      </NavLink>

      <NavLink to="/search" className={linkClass}>
        {({ isActive }) => (<>{isActive && <ActiveDot />}<SearchIcon className="size-5" />Search</>)}
      </NavLink>

      {isSignedIn ? (
        <>
          <NavLink to="/wishlist" className={linkClass}>
            {({ isActive }) => (
              <>
                {isActive && <ActiveDot />}
                <span className="relative">
                  <HeartIcon className="size-5" filled={wishlistCount > 0} />
                  {wishlistCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex size-[14px] items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">
                      {wishlistCount > 9 ? "9+" : wishlistCount}
                    </span>
                  )}
                </span>
                Wishlist
              </>
            )}
          </NavLink>

          <button
            type="button"
            onClick={onCartOpen}
            className="relative flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-semibold text-ink4 hover:text-ink3 transition-all duration-200"
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
            {({ isActive }) => (<>{isActive && <ActiveDot />}<HeartIcon className="size-5" />Wishlist</>)}
          </NavLink>
          <NavLink to="/login" className={linkClass}>
            {({ isActive }) => (<>{isActive && <ActiveDot />}<CartIcon className="size-5" />Cart</>)}
          </NavLink>
        </>
      )}

      <NavLink to={isSignedIn ? "/account/profile" : "/login"} className={linkClass}>
        {({ isActive }) => (<>{isActive && <ActiveDot />}<UserIcon className="size-5" />Account</>)}
      </NavLink>
    </nav>
  );
}
