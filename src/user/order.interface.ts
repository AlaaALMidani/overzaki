export interface Order {
  id?: string;
  userId: string;
  serviceName: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  paymentIntent?: any;
  createdAt: Date;
}
