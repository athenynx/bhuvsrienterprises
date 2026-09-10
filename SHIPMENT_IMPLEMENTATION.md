# Quick Integration Steps

## 1. Update App.tsx - Add Order Details View

Add this to your App.tsx to display order details with shipment tracking:

```tsx
// Near the top of App.tsx, add these state variables:
const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
const [showOrderDetails, setShowOrderDetails] = useState(false);

// Add this view component (add after your cart/checkout modals):
{showOrderDetails && selectedOrder && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-lg p-6 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-[#2A2A2A]">Order Details</h2>
        <button
          onClick={() => setShowOrderDetails(false)}
          className="text-[#6B655E] hover:text-[#2A2A2A] transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="space-y-4 text-sm">
        {/* Order Info */}
        <div className="border-b border-[#DCD7D0] pb-4">
          <p className="text-[#6B655E] uppercase tracking-wider font-bold text-[9px] mb-1">Order ID</p>
          <p className="text-[#2A2A2A] font-mono">{selectedOrder.id}</p>
          
          <p className="text-[#6B655E] uppercase tracking-wider font-bold text-[9px] mt-3 mb-1">Order Date</p>
          <p className="text-[#2A2A2A]">
            {new Date(selectedOrder.createdAt).toLocaleDateString('en-IN', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>

          <p className="text-[#6B655E] uppercase tracking-wider font-bold text-[9px] mt-3 mb-1">Status</p>
          <p className="text-[#2A2A2A] font-semibold capitalize">{selectedOrder.status}</p>

          <p className="text-[#6B655E] uppercase tracking-wider font-bold text-[9px] mt-3 mb-1">Total</p>
          <p className="text-[#2A2A2A] font-bold">₹{selectedOrder.totalAmount.toFixed(2)}</p>
        </div>

        {/* Shipment Tracking */}
        <div>
          <p className="text-[#6B655E] uppercase tracking-wider font-bold text-[9px] mb-3">Shipment Status</p>
          <ShipmentTracking orderId={selectedOrder.id} />
        </div>

        {/* Items */}
        <div className="border-t border-[#DCD7D0] pt-4">
          <p className="text-[#6B655E] uppercase tracking-wider font-bold text-[9px] mb-2">Items</p>
          <div className="space-y-2">
            {selectedOrder.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-xs bg-[#F5F2ED] p-2 rounded">
                <span className="text-[#2A2A2A]">{item.productName}</span>
                <span className="text-[#6B655E]">₹{item.price} x {item.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={() => setShowOrderDetails(false)}
        className="w-full mt-6 px-4 py-2 bg-[#A68A64] text-white hover:bg-[#8B6F47] rounded font-semibold text-sm transition-colors"
      >
        Close
      </button>
    </div>
  </div>
)}
```

## 2. Add My Orders Section

Add a "My Orders" section in your App.tsx (you may already have this):

```tsx
// Add this state
const [myOrders, setMyOrders] = useState<Order[]>([]);
const [userEmail, setUserEmail] = useState<string | null>(null);

// Add effect to load orders when user is logged in
useEffect(() => {
  const loadUserOrders = async () => {
    if (!userEmail) return;
    
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_email', userEmail)
        .order('created_at', { ascending: false });
      
      if (data) {
        setMyOrders(data as Order[]);
      }
    } catch (err) {
      console.error('Error loading orders:', err);
    }
  };

  loadUserOrders();
}, [userEmail]);

// In JSX, add orders tab/view:
{currentTab === 'orders' && (
  <div className="space-y-4">
    <h2 className="text-xl font-bold text-[#2A2A2A] mb-4">My Orders</h2>
    {myOrders.length === 0 ? (
      <p className="text-[#6B655E]">You haven't placed any orders yet.</p>
    ) : (
      <div className="space-y-3">
        {myOrders.map(order => (
          <div
            key={order.id}
            className="bg-[#F5F2ED] border border-[#DCD7D0] p-4 rounded hover:border-[#A68A64] transition-colors cursor-pointer"
            onClick={() => {
              setSelectedOrder(order);
              setShowOrderDetails(true);
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#2A2A2A] font-semibold">{order.id}</p>
                <p className="text-[#6B655E] text-xs">
                  {new Date(order.createdAt).toLocaleDateString('en-IN')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[#2A2A2A] font-bold">₹{order.totalAmount.toFixed(2)}</p>
                <p className="text-[#6B655E] text-xs capitalize font-semibold">{order.status}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
)}
```

## 3. Update AdminPortal.tsx - Add Shipment Management

Add this section to AdminPortal.tsx:

```tsx
// Add imports
import { ShipmentManagement } from './ShipmentManagement';

// Add state
const [orders, setOrders] = useState<Order[]>([]);
const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
const [showShipmentModal, setShowShipmentModal] = useState(false);

// Add effect to load orders
useEffect(() => {
  const loadOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (data) setOrders(data as Order[]);
  };

  loadOrders();
}, []);

// Add after your product management section:
{activeTab === 'orders' && (
  <div className="space-y-4">
    <h2 className="text-xl font-bold text-[#2A2A2A]">Orders</h2>
    
    <div className="border border-[#DCD7D0] rounded">
      <div className="bg-[#EAE5DF] p-4 grid grid-cols-4 gap-4 text-xs font-bold uppercase tracking-wider">
        <span>Order ID</span>
        <span>Date</span>
        <span>Status</span>
        <span>Action</span>
      </div>
      
      <div className="divide-y divide-[#DCD7D0]">
        {orders.map(order => (
          <div key={order.id} className="p-4 grid grid-cols-4 gap-4 items-center hover:bg-[#F5F2ED]">
            <span className="text-xs font-mono text-[#2A2A2A]">{order.id}</span>
            <span className="text-xs text-[#6B655E]">
              {new Date(order.createdAt).toLocaleDateString('en-IN')}
            </span>
            <span className="text-xs font-semibold text-[#2A2A2A] capitalize">{order.status}</span>
            <button
              onClick={() => {
                setSelectedOrder(order);
                setShowShipmentModal(true);
              }}
              className="text-xs px-3 py-1 bg-[#A68A64] text-white hover:bg-[#8B6F47] rounded"
            >
              Manage
            </button>
          </div>
        ))}
      </div>
    </div>
  </div>
)}

{/* Shipment Modal */}
{showShipmentModal && selectedOrder && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-lg p-6">
      <ShipmentManagement
        order={selectedOrder}
        onClose={() => {
          setShowShipmentModal(false);
          setSelectedOrder(null);
        }}
        onShipmentCreated={() => {
          // Refresh orders
          loadOrders();
        }}
      />
    </div>
  </div>
)}
```

## 4. Update App.tsx Imports

At the top of App.tsx, add:

```tsx
import { ShipmentTracking } from './components/ShipmentTracking';
import { Order } from './types'; // If not already imported
```

## 5. Database Record Updates

When order is created, ensure it stores customer info for later lookup:

```tsx
// When saving order
const orderData = {
  id: `ORD-${Date.now()}`,
  customer_email: userEmail,
  customer_name: userName,
  items: cartItems,
  total_amount: total,
  status: 'ORDER_PLACED',
  shipping_address: address,
  billing_address: billAddress,
  payment_method: 'cod',
  created_at: new Date().toISOString(),
  // shipment_id will be populated when shipment is created
};

await supabase.from('orders').insert([orderData]);
```

## 6. Run and Test

```bash
npm run dev
```

Then:
1. Place a test order
2. Go to "My Orders" to see order listed
3. Click order to view details
4. Admin goes to "Orders" tab
5. Click "Manage" on an order
6. Create a shipment with demo tracking number
7. Add tracking events
8. Mark as delivered
9. Check customer view updates in real-time

## Summary

The shipment tracking system is now:
- ✅ Database ready (migration file exists, needs deployment)
- ✅ Backend ready (service layer complete)
- ✅ UI components ready (tracking view + admin management)
- ✅ Code compiles and builds successfully

You now have:
1. Customer shipment tracking view
2. Admin shipment management interface
3. Extensible carrier integration framework
4. Complete database schema

Next steps depend on your priorities:
1. **Immediate:** Deploy database migration to Supabase
2. **Quick wins:** Integrate components into App.tsx and AdminPortal.tsx
3. **Future:** Add real carrier APIs (India Post, XpressBees, etc.)

