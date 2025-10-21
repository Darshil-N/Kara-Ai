import { useState } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Check, Sparkles } from 'lucide-react';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

const pricingTiers = [
  {
    name: 'Free',
    price: { monthly: 0, yearly: 0 },
    description: 'Perfect for getting started',
    features: [
      '3 interview sessions per month',
      'Basic feedback analysis',
      'Standard AI personas',
      'Email support'
    ],
    buttonText: 'Get Started Free',
    buttonVariant: 'outline' as const,
    popular: false
  },
  {
    name: 'Premium',
    price: { monthly: 29, yearly: 24 },
    description: 'Best for serious job seekers',
    features: [
      'Unlimited interview sessions',
      'Advanced analytics & insights',
      'AI persona library (15+ personalities)',
      'Downloadable PDF reports',
      'Performance trending',
      'Priority support',
      'Custom interview scenarios'
    ],
    buttonText: 'Upgrade to Premium',
    buttonVariant: 'default' as const,
    popular: true
  },
  {
    name: 'Teams',
    price: { monthly: 49, yearly: 39 },
    description: 'For HR teams and career centers',
    features: [
      'Everything in Premium',
      'Team dashboard & analytics',
      'Bulk user management',
      'Custom branding',
      'API access',
      'Dedicated account manager',
      'Enterprise security'
    ],
    buttonText: 'Contact Sales',
    buttonVariant: 'outline' as const,
    popular: false
  }
];

export default function Pricing() {
  const [isYearly, setIsYearly] = useState(false);
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success')) {
      alert('Payment successful! Your Premium features will be activated shortly.');
    }
    if (params.get('canceled')) {
      // no-op for now
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Header */}
      <section className="pt-32 pb-16">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Simple, Transparent{' '}
            <span className="hero-gradient-text">Pricing</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Choose the perfect plan for your interview preparation needs. 
            Start free and upgrade when you're ready to unlock advanced features.
          </p>
        </div>
      </section>

      {/* Billing Toggle */}
      <section className="pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center space-x-4">
            <span className={`text-sm font-medium ${!isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
              Monthly
            </span>
            <Switch
              checked={isYearly}
              onCheckedChange={setIsYearly}
              className="data-[state=checked]:bg-primary"
            />
            <span className={`text-sm font-medium ${isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
              Yearly
            </span>
            <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
              Save 20%
            </Badge>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingTiers.map((tier) => (
              <div
                key={tier.name}
                className={`premium-card relative ${tier.popular ? 'ring-2 ring-primary shadow-lg scale-105' : ''}`}
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-foreground mb-2">{tier.name}</h3>
                  <p className="text-muted-foreground mb-6">{tier.description}</p>
                  
                  <div className="mb-6">
                    <div className="flex items-baseline justify-center">
                      <span className="text-5xl font-bold text-foreground">
                        ${isYearly ? tier.price.yearly : tier.price.monthly}
                      </span>
                      {tier.price.monthly > 0 && (
                        <span className="text-muted-foreground ml-2">
                          /{isYearly ? 'year' : 'month'}
                        </span>
                      )}
                    </div>
                    {isYearly && tier.price.monthly > 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Billed annually (${tier.price.monthly * 12}/year)
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  {tier.features.map((feature, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-foreground">{feature}</span>
                    </div>
                  ))}
                </div>

                <Button 
                  className="w-full" 
                  variant={tier.buttonVariant}
                  onClick={async () => {
                    if (tier.name === 'Premium') {
                      // Require login before allowing checkout
                      const { data: { session } } = await supabase.auth.getSession();
                      if (!session) {
                        const redirect = encodeURIComponent(window.location.pathname + window.location.search);
                        window.location.href = `/login?redirect=${redirect}`;
                        return;
                      }
                      // Call local backend to create a Stripe Checkout Session in test mode
                      fetch('/api/create-checkout-session', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ plan: 'premium' })
                      })
                        .then(async (r) => {
                          const data = await r.json();
                          if (data?.url) {
                            window.location.href = data.url;
                          } else {
                            alert('Failed to start checkout.');
                          }
                        })
                        .catch(() => alert('Failed to start checkout.'));
                    }
                  }}
                >
                  {tier.buttonText}
                </Button>
                
                {tier.name === 'Free' && (
                  <p className="text-xs text-muted-foreground text-center mt-3">
                    No credit card required
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-card/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Frequently Asked Questions</h2>
            <p className="text-xl text-muted-foreground">
              Everything you need to know about KARA AI pricing and features.
            </p>
          </div>
          
          <div className="space-y-8">
            <div className="premium-card">
              <h3 className="font-semibold text-lg mb-3">Can I cancel my subscription anytime?</h3>
              <p className="text-muted-foreground">
                Yes, you can cancel your Premium subscription at any time. You'll retain access to Premium features until the end of your current billing period.
              </p>
            </div>
            
            <div className="premium-card">
              <h3 className="font-semibold text-lg mb-3">What payment methods do you accept?</h3>
              <p className="text-muted-foreground">
                We accept all major credit cards (Visa, MasterCard, American Express) and PayPal. All payments are processed securely through Stripe.
              </p>
            </div>
            
            <div className="premium-card">
              <h3 className="font-semibold text-lg mb-3">Is there a money-back guarantee?</h3>
              <p className="text-muted-foreground">
                Yes, we offer a 30-day money-back guarantee for Premium subscriptions. If you're not satisfied, we'll refund your payment in full.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}