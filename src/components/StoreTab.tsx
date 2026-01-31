import { useState, useEffect } from "react";
import { ShoppingBag, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

interface StoreProduct {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  disclaimer: string | null;
  is_active: boolean;
}

interface StoreStat {
  key: string;
  value: number;
}

const orderSchema = z.object({
  customer_name: z.string().trim().min(1, "الاسم مطلوب").max(100, "الاسم طويل جداً"),
  customer_email: z.string().trim().email("البريد الإلكتروني غير صحيح").max(255, "البريد طويل جداً"),
  telegram_username: z.string().trim().max(100, "اسم المستخدم طويل جداً").optional(),
  instagram_username: z.string().trim().max(100, "اسم المستخدم طويل جداً").optional(),
});

const StoreTab = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [completedOrders, setCompletedOrders] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [showOrderForm, setShowOrderForm] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  
  const [orderData, setOrderData] = useState({
    customer_name: "",
    customer_email: "",
    telegram_username: "",
    instagram_username: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchProducts();
    fetchStats();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("store_products")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .from("store_stats")
        .select("*")
        .eq("key", "completed_orders")
        .single();
      
      if (error) throw error;
      setCompletedOrders(data?.value || 0);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleProductClick = (productId: string) => {
    setExpandedProduct(expandedProduct === productId ? null : productId);
    setShowOrderForm(null);
    setOrderSuccess(false);
  };

  const handleOrderClick = (productId: string) => {
    setShowOrderForm(productId);
    setOrderData({
      customer_name: "",
      customer_email: "",
      telegram_username: "",
      instagram_username: "",
    });
    setErrors({});
    setOrderSuccess(false);
  };

  const validateForm = () => {
    try {
      orderSchema.parse(orderData);
      
      // Check at least one contact method
      if (!orderData.telegram_username && !orderData.instagram_username) {
        setErrors({ contact: "يجب إدخال حساب تيليغرام أو إنستاجرام على الأقل" });
        return false;
      }
      
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path[0]) {
            newErrors[e.path[0].toString()] = e.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmitOrder = async (productId: string) => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from("store_orders").insert({
        product_id: productId,
        customer_name: orderData.customer_name.trim(),
        customer_email: orderData.customer_email.trim(),
        telegram_username: orderData.telegram_username.trim() || null,
        instagram_username: orderData.instagram_username.trim() || null,
        status: "pending",
      });

      if (error) throw error;

      setOrderSuccess(true);
      setShowOrderForm(null);
      toast({
        title: "تم إرسال الطلب",
        description: "سنتواصل معك بأقرب وقت",
      });
    } catch (error) {
      console.error("Error submitting order:", error);
      toast({
        title: "خطأ",
        description: "فشل في إرسال الطلب، حاول مرة أخرى",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 px-4 pt-8">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-cta/10 flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="text-cta" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">المتجر</h1>
          <p className="text-muted-foreground">منتجات رقمية موثوقة</p>
        </div>

        {/* Products */}
        <div className="space-y-4">
          {products.map((product) => (
            <div key={product.id} className="glass-card rounded-2xl overflow-hidden">
              {/* Product Card - Clickable */}
              <button
                onClick={() => handleProductClick(product.id)}
                className="w-full text-center"
              >
                {/* Large Product Image */}
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-primary/10 flex items-center justify-center">
                    <ShoppingBag className="text-primary" size={48} />
                  </div>
                )}
                
                {/* Product Name */}
                <div className="p-4 flex items-center justify-between">
                  <div className="text-right">
                    <h3 className="font-semibold text-foreground">{product.name}</h3>
                    <p className="text-xs text-muted-foreground">اضغط للتفاصيل</p>
                  </div>
                  {expandedProduct === product.id ? (
                    <ChevronUp className="text-muted-foreground" size={20} />
                  ) : (
                    <ChevronDown className="text-muted-foreground" size={20} />
                  )}
                </div>
              </button>

              {/* Expanded Content */}
              {expandedProduct === product.id && (
                <div className="px-4 pb-4 space-y-4">

                  {/* Description */}
                  {product.description && (
                    <div className="bg-secondary/50 rounded-xl p-4">
                      <h4 className="font-semibold text-foreground mb-2">الوصف</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                        {product.description}
                      </p>
                    </div>
                  )}

                  {/* Disclaimer */}
                  {product.disclaimer && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                        <div>
                          <h4 className="font-semibold text-amber-600 dark:text-amber-400 mb-1 text-sm">
                            إخلاء مسؤولية
                          </h4>
                          <p className="text-xs text-amber-700 dark:text-amber-300">
                            {product.disclaimer}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Success Message */}
                  {orderSuccess && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="text-green-500" size={20} />
                        <p className="text-green-700 dark:text-green-400 font-medium">
                          سنتواصل معك بأقرب وقت
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Order Form */}
                  {showOrderForm === product.id ? (
                    <div className="space-y-4 bg-card rounded-xl p-4 border border-border">
                      <h4 className="font-semibold text-foreground text-center">تأكيد الطلب</h4>
                      
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          الاسم *
                        </label>
                        <input
                          type="text"
                          value={orderData.customer_name}
                          onChange={(e) => setOrderData({ ...orderData, customer_name: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg border border-border bg-background 
                                   focus:outline-none focus:ring-2 focus:ring-primary/50 text-right"
                          placeholder="اسمك الكامل"
                        />
                        {errors.customer_name && (
                          <p className="text-xs text-destructive mt-1">{errors.customer_name}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          البريد الإلكتروني *
                        </label>
                        <input
                          type="email"
                          value={orderData.customer_email}
                          onChange={(e) => setOrderData({ ...orderData, customer_email: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg border border-border bg-background 
                                   focus:outline-none focus:ring-2 focus:ring-primary/50"
                          placeholder="email@example.com"
                          dir="ltr"
                        />
                        {errors.customer_email && (
                          <p className="text-xs text-destructive mt-1">{errors.customer_email}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          حساب تيليغرام
                        </label>
                        <input
                          type="text"
                          value={orderData.telegram_username}
                          onChange={(e) => setOrderData({ ...orderData, telegram_username: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg border border-border bg-background 
                                   focus:outline-none focus:ring-2 focus:ring-primary/50"
                          placeholder="@username"
                          dir="ltr"
                        />
                        {errors.telegram_username && (
                          <p className="text-xs text-destructive mt-1">{errors.telegram_username}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          حساب إنستاجرام
                        </label>
                        <input
                          type="text"
                          value={orderData.instagram_username}
                          onChange={(e) => setOrderData({ ...orderData, instagram_username: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg border border-border bg-background 
                                   focus:outline-none focus:ring-2 focus:ring-primary/50"
                          placeholder="@username"
                          dir="ltr"
                        />
                        {errors.instagram_username && (
                          <p className="text-xs text-destructive mt-1">{errors.instagram_username}</p>
                        )}
                      </div>

                      {errors.contact && (
                        <p className="text-xs text-destructive text-center">{errors.contact}</p>
                      )}

                      <p className="text-xs text-muted-foreground text-center">
                        الدفع كاش أو بالاتفاق الشخصي
                      </p>

                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowOrderForm(null)}
                          className="flex-1 py-2 rounded-lg border border-border text-foreground
                                   hover:bg-secondary transition-colors"
                        >
                          إلغاء
                        </button>
                        <button
                          onClick={() => handleSubmitOrder(product.id)}
                          disabled={submitting}
                          className="flex-1 bg-cta text-cta-foreground py-2 rounded-lg font-semibold 
                                   hover:brightness-105 transition-all disabled:opacity-50
                                   flex items-center justify-center gap-2"
                        >
                          {submitting && <Loader2 size={16} className="animate-spin" />}
                          إرسال الطلب
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleOrderClick(product.id)}
                      className="w-full bg-cta text-cta-foreground py-3 rounded-xl font-semibold 
                               hover:brightness-105 transition-all"
                    >
                      اطلب الآن
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Empty State */}
        {products.length === 0 && (
          <div className="text-center py-12">
            <ShoppingBag className="mx-auto text-muted-foreground mb-4" size={48} />
            <p className="text-muted-foreground">لا توجد منتجات حالياً</p>
          </div>
        )}

        {/* Completed Orders Counter */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 bg-green-500/10 text-green-700 dark:text-green-400 
                         px-4 py-2 rounded-full border border-green-500/20">
            <CheckCircle2 size={18} />
            <span className="font-semibold">{completedOrders}</span>
            <span className="text-sm">طلب مكتمل</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreTab;
