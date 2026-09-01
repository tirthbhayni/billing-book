export type Purchase = {
  id: string;
  created_at: string;
  date: string; // YYYY-MM-DD
  buyer_name: string;
  item_description: string;
  quantity: number;
  price: number;
};

export type Payment = {
  id: string;
  created_at: string;
  date: string;
  buyer_name: string;
  amount: number;
};

export type Buyer = {
  id: string;
  name: string;
};

export type ReceivedPayment = {
  id: string;
  created_at: string;
  date: string;
  platform: string; // Meesho, Flipkart, etc.
  amount: number;
};

export interface Expense {
  id: string;
  date: string;
  category: string;
  amount: number;
  description?: string;
  created_at: string;
}

export interface SkuCost {
  sku: string;
  cost: number;
}

export interface AppSetting {
  key: string;
  value: string;
};
