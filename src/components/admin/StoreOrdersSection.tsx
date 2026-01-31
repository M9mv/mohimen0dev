import { useState, useEffect, useCallback } from "react";
import { ShoppingBag, Check, X, Loader2, Plus, Trash2, Package, Clock, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface StoreOrder {
  id: string;
  product_id: string;
  customer_name: string;
  customer_email: string;
  telegram_username: string | null;
  instagram_username: string | null;
  status: string;
  created_at: string;
  product?: {
    name: string;
  };
}

interface StoreProduct {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  disclaimer: string | null;
  is_active: boolean;
  display_order: number;
}

interface StoreOrdersSectionProps {
  sessionToken: string;
  onSessionExpired: () => void;
}

const StoreOrdersSection = ({ sessionToken, onSessionExpired }: StoreOrdersSectionProps) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"orders" | "products" | "completed">("orders");
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [completedOrders, setCompletedOrders] = useState<StoreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  // New product form
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    disclaimer: "",
    image_url: "",
  });
  const [saving, setSaving] = useState(false);

  const adminOperation = useCallback(async (action: string, data: Record<string, unknown>) => {
    if (!sessionToken) {
      onSessionExpired();
      return { success: false };
    }

    try {
      const { data: result, error } = await supabase.functions.invoke("admin-operations", {
        body: { action, sessionToken, data },
      });

      if (error) throw error;

      if (result?.sessionExpired) {
        onSessionExpired();
        return { success: false };
      }

      return result;
    } catch (error) {
      console.error("Admin operation error:", error);
      toast({
        title: "خطأ",
        description: "فشلت العملية",
        variant: "destructive",
      });
      return { success: false };
    }
  }, [sessionToken, onSessionExpired, toast]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch orders via admin operation
      const ordersResult = await adminOperation("get_store_orders", {});
      if (ordersResult?.orders) {
        const pending = ordersResult.orders.filter((o: StoreOrder) => o.status === "pending");
        const completed = ordersResult.orders.filter((o: StoreOrder) => o.status === "accepted");
        setOrders(pending);
        setCompletedOrders(completed);
      }

      // Fetch products
      const { data: productsData } = await supabase
        .from("store_products")
        .select("*")
        .order("display_order", { ascending: true });
      setProducts(productsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [adminOperation]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAcceptOrder = async (orderId: string) => {
    setProcessing(orderId);
    try {
      const result = await adminOperation("update_order_status", {
        order_id: orderId,
        status: "accepted",
      });

      if (result?.success) {
        toast({
          title: "تم قبول الطلب",
          description: "تم إرسال إشعار للزبون",
        });
        fetchData();
      }
    } finally {
      setProcessing(null);
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    setProcessing(orderId);
    try {
      const result = await adminOperation("update_order_status", {
        order_id: orderId,
        status: "rejected",
      });

      if (result?.success) {
        toast({
          title: "تم رفض الطلب",
        });
        fetchData();
      }
    } finally {
      setProcessing(null);
    }
  };

  const handleAddProduct = async () => {
    if (!newProduct.name.trim()) {
      toast({
        title: "خطأ",
        description: "اسم المنتج مطلوب",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const result = await adminOperation("add_store_product", {
        name: newProduct.name.trim(),
        description: newProduct.description.trim() || null,
        disclaimer: newProduct.disclaimer.trim() || null,
        image_url: newProduct.image_url.trim() || null,
        is_active: true,
        display_order: products.length,
      });

      if (result?.success) {
        toast({
          title: "تم إضافة المنتج",
        });
        setNewProduct({ name: "", description: "", disclaimer: "", image_url: "" });
        setShowNewProduct(false);
        fetchData();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المنتج؟")) return;

    try {
      const result = await adminOperation("delete_store_product", { id: productId });
      if (result?.success) {
        toast({ title: "تم حذف المنتج" });
        fetchData();
      }
    } catch (error) {
      console.error("Error deleting product:", error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ar-IQ", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setActiveTab("orders")}
          className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
            activeTab === "orders"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-accent"
          }`}
        >
          <Clock size={18} />
          الطلبات الجديدة
          {orders.length > 0 && (
            <span className="bg-cta text-cta-foreground text-xs px-2 py-0.5 rounded-full">
              {orders.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("products")}
          className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
            activeTab === "products"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-accent"
          }`}
        >
          <Package size={18} />
          المنتجات
        </button>
        <button
          onClick={() => setActiveTab("completed")}
          className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
            activeTab === "completed"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-accent"
          }`}
        >
          <CheckCircle2 size={18} />
          الطلبات المكتملة
          <span className="text-xs opacity-75">({completedOrders.length})</span>
        </button>
      </div>

      {/* Pending Orders Tab */}
      {activeTab === "orders" && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-primary flex items-center gap-2">
            <ShoppingBag size={24} />
            الطلبات الجديدة ({orders.length})
          </h2>

          {orders.length === 0 ? (
            <div className="bg-background rounded-xl p-8 border border-border text-center">
              <Clock className="mx-auto text-muted-foreground mb-4" size={48} />
              <p className="text-muted-foreground">لا توجد طلبات جديدة</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-background rounded-xl p-4 border border-border shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{order.customer_name}</span>
                        <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                          {order.product?.name || "منتج محذوف"}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>📧 {order.customer_email}</p>
                        {order.telegram_username && (
                          <p>
                            <a
                              href={`https://t.me/${order.telegram_username.replace("@", "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              📱 Telegram: {order.telegram_username}
                            </a>
                          </p>
                        )}
                        {order.instagram_username && (
                          <p>
                            <a
                              href={`https://instagram.com/${order.instagram_username.replace("@", "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              📸 Instagram: {order.instagram_username}
                            </a>
                          </p>
                        )}
                        <p className="text-xs">{formatDate(order.created_at)}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptOrder(order.id)}
                        disabled={processing === order.id}
                        className="flex items-center gap-1 px-4 py-2 bg-green-500 text-white rounded-lg
                                 hover:bg-green-600 transition-colors disabled:opacity-50"
                      >
                        {processing === order.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Check size={16} />
                        )}
                        قبول
                      </button>
                      <button
                        onClick={() => handleRejectOrder(order.id)}
                        disabled={processing === order.id}
                        className="flex items-center gap-1 px-4 py-2 bg-destructive text-destructive-foreground 
                                 rounded-lg hover:brightness-110 transition-all disabled:opacity-50"
                      >
                        <X size={16} />
                        رفض
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Products Tab */}
      {activeTab === "products" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-primary flex items-center gap-2">
              <Package size={24} />
              المنتجات ({products.length})
            </h2>
            <button
              onClick={() => setShowNewProduct(true)}
              className="bg-cta text-cta-foreground px-4 py-2 rounded-lg font-semibold 
                       hover:brightness-105 transition-all flex items-center gap-2"
            >
              <Plus size={20} />
              إضافة منتج
            </button>
          </div>

          {/* New Product Form */}
          {showNewProduct && (
            <div className="bg-background rounded-xl p-6 border border-border shadow-lg">
              <h3 className="font-semibold text-foreground mb-4">إضافة منتج جديد</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    اسم المنتج (بالإنكليزي) *
                  </label>
                  <input
                    type="text"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background 
                             focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Product Name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    الوصف (بالعربي)
                  </label>
                  <textarea
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background 
                             focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                    placeholder="وصف المنتج..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    إخلاء المسؤولية
                  </label>
                  <input
                    type="text"
                    value={newProduct.disclaimer}
                    onChange={(e) => setNewProduct({ ...newProduct, disclaimer: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background 
                             focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="ملاحظة مختصرة..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    رابط الصورة
                  </label>
                  <input
                    type="url"
                    value={newProduct.image_url}
                    onChange={(e) => setNewProduct({ ...newProduct, image_url: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background 
                             focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="https://..."
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowNewProduct(false)}
                    className="flex-1 py-2 rounded-lg border border-border text-foreground
                             hover:bg-secondary transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleAddProduct}
                    disabled={saving}
                    className="flex-1 bg-cta text-cta-foreground py-2 rounded-lg font-semibold 
                             hover:brightness-105 transition-all disabled:opacity-50
                             flex items-center justify-center gap-2"
                  >
                    {saving && <Loader2 size={16} className="animate-spin" />}
                    إضافة
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Products List */}
          <div className="space-y-3">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-background rounded-xl p-4 border border-border flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-12 h-12 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center">
                      <Package className="text-muted-foreground" size={20} />
                    </div>
                  )}
                  <div>
                    <h4 className="font-semibold text-foreground">{product.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {product.is_active ? "نشط" : "غير نشط"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteProduct(product.id)}
                  className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Orders Tab */}
      {activeTab === "completed" && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-primary flex items-center gap-2">
            <CheckCircle2 size={24} />
            الطلبات المكتملة ({completedOrders.length})
          </h2>

          {completedOrders.length === 0 ? (
            <div className="bg-background rounded-xl p-8 border border-border text-center">
              <CheckCircle2 className="mx-auto text-muted-foreground mb-4" size={48} />
              <p className="text-muted-foreground">لا توجد طلبات مكتملة</p>
            </div>
          ) : (
            <div className="space-y-3">
              {completedOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-background rounded-xl p-4 border border-green-500/20 bg-green-500/5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="text-green-500" size={16} />
                        <span className="font-semibold text-foreground">{order.customer_name}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {order.product?.name || "منتج محذوف"} • {formatDate(order.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StoreOrdersSection;
