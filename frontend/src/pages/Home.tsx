import { Sidebar, MobileNav } from "@/components/Sidebar";
import { useRecipients } from "@/hooks/use-recipients";
import { useVariables } from "@/hooks/use-variables";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Database, Send, ArrowRight, Zap, Shield, Sparkles } from "lucide-react";

export default function Home() {
  const { data: recipients } = useRecipients();
  const { data: variables } = useVariables();

  const stats = [
    { label: "Total Recipients", value: recipients?.length || 0, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Custom Variables", value: variables?.length || 0, icon: Database, color: "text-purple-500", bg: "bg-purple-500/10" },
    { label: "Campaigns Sent", value: "0", icon: Send, color: "text-green-500", bg: "bg-green-500/10" },
  ];

  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar />
      <MobileNav />

      <main className="flex-1 p-6 md:p-8 lg:p-10 pb-20 md:pb-10">
        <div className="max-w-5xl mx-auto space-y-8">
          
          <div className="bg-gradient-to-r from-primary to-indigo-600 rounded-3xl p-8 md:p-12 text-white shadow-xl shadow-primary/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
            
            <div className="relative z-10 max-w-2xl">
              <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
                Welcome to DynMail
              </h1>
              <p className="text-primary-foreground/90 text-lg mb-8 leading-relaxed">
                The most powerful way to send personalized emails at scale. 
                Import your data, define variables, and send targeted campaigns in minutes.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/send">
                  <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold h-12 px-8">
                    Start Campaign
                  </Button>
                </Link>
                <Link href="/recipients">
                  <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 h-12 px-8">
                    Manage Recipients
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {stats.map((stat) => (
              <Card key={stat.label} className="border-border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold font-display">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Quick Actions</h2>
              <div className="grid grid-cols-1 gap-4">
                <Link href="/recipients">
                  <div className="group bg-card hover:bg-accent/50 p-4 rounded-xl border border-border cursor-pointer transition-colors flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Import Recipients</h3>
                        <p className="text-sm text-muted-foreground">Upload CSV or add manually</p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </Link>

                <Link href="/variables">
                  <div className="group bg-card hover:bg-accent/50 p-4 rounded-xl border border-border cursor-pointer transition-colors flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-purple-100 text-purple-600 p-2 rounded-lg">
                        <Database className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Define Variables</h3>
                        <p className="text-sm text-muted-foreground">Set up dynamic data tags</p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </Link>
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Why DynMail?</h2>
              <div className="space-y-4">
                 <div className="flex gap-4 items-start">
                   <div className="p-2 bg-yellow-100 text-yellow-600 rounded-lg mt-1">
                     <Zap className="w-4 h-4" />
                   </div>
                   <div>
                     <h3 className="font-semibold">Lightning Fast</h3>
                     <p className="text-sm text-muted-foreground">Process thousands of variables in seconds.</p>
                   </div>
                 </div>
                 <div className="flex gap-4 items-start">
                   <div className="p-2 bg-green-100 text-green-600 rounded-lg mt-1">
                     <Shield className="w-4 h-4" />
                   </div>
                   <div>
                     <h3 className="font-semibold">Secure & Reliable</h3>
                     <p className="text-sm text-muted-foreground">Your recipient data is encrypted and safe.</p>
                   </div>
                 </div>
                 <div className="flex gap-4 items-start">
                   <div className="p-2 bg-pink-100 text-pink-600 rounded-lg mt-1">
                     <Sparkles className="w-4 h-4" />
                   </div>
                   <div>
                     <h3 className="font-semibold">Unlimited Customization</h3>
                     <p className="text-sm text-muted-foreground">Use any data field as a variable in your emails.</p>
                   </div>
                 </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
