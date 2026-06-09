import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "../lib/queryKeys";
import * as cartService from "../services/cart";
import type { Cart, CartItem } from "../lib/types";

export function useCartMutations() {
  const queryClient = useQueryClient();

  const addItem = useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      cartService.addItem(productId, quantity),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.cart() }),
    onError: () => toast.error("Could not add to cart"),
  });

  const updateItem = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      cartService.updateItem(itemId, quantity),
    onMutate: async ({ itemId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cart() });
      const previous = queryClient.getQueryData<Cart>(queryKeys.cart());
      queryClient.setQueryData<Cart>(queryKeys.cart(), (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((i: CartItem) =>
            i.id === itemId ? { ...i, quantity } : i,
          ),
        };
      });
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(queryKeys.cart(), ctx.previous);
      toast.error("Could not update quantity");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.cart() }),
  });

  const removeItem = useMutation({
    mutationFn: (itemId: string) => cartService.removeItem(itemId),
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cart() });
      const previous = queryClient.getQueryData<Cart>(queryKeys.cart());
      queryClient.setQueryData<Cart>(queryKeys.cart(), (old) => {
        if (!old) return old;
        return { ...old, items: old.items.filter((i: CartItem) => i.id !== itemId) };
      });
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(queryKeys.cart(), ctx.previous);
      toast.error("Could not remove item");
    },
    onSuccess: () => toast.success("Item removed"),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.cart() }),
  });

  const clearCart = useMutation({
    mutationFn: () => cartService.clearCart(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cart() });
      const previous = queryClient.getQueryData<Cart>(queryKeys.cart());
      queryClient.setQueryData<Cart>(queryKeys.cart(), (old) => old ? { ...old, items: [] } : old);
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(queryKeys.cart(), ctx.previous);
      toast.error("Could not clear cart");
    },
    onSuccess: () => toast.success("Cart cleared"),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.cart() }),
  });

  return { addItem, updateItem, removeItem, clearCart };
}
