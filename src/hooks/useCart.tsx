import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart")

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const newProduct = await api.get('products/'+productId).then(response => response.data)
      const productSelected = cart.filter(product => product.id === productId).shift()
      const stock = await api.get('stock/'+productId).then(response => response.data)

      if(productSelected && !(productSelected?.amount < stock.amount)){
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const newCart = (productSelected)
      ? cart.map(product => {
        return product.id === productId? {...product, amount: product.amount+1} : product
      })
      : [...cart, {
        ...newProduct,
        amount: 1
      }]

      await setCart(newCart)

      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch {
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      if(!cart.filter(product => product.id === productId).length){
        throw new Error("remocao producao nao existe");
      }
      const newCart = cart.filter(product => product.id !== productId)

      await setCart(newCart)

      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount < 1){
        return;
      }

      const stock = await api.get('stock/'+productId).then(response => response.data)
      if(!stock){
        return;
      }

      if(!(amount <= stock.amount)){
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const newCart = cart.map(product => {
        return product.id === productId? {...product, amount} : product
      })

      await setCart(newCart)

      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
