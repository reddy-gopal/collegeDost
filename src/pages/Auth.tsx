import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Chrome, Phone } from "lucide-react";
import { countryCodes, type CountryCode } from "@/utils/countryCodes";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const BACKEND_URL = "http://localhost:5000";

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(countryCodes[0]); // Default to India
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [fullPhoneNumber, setFullPhoneNumber] = useState("");
  const [timer, setTimer] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Timer countdown effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        }
      });
      
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to sign in with Google",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handlePhoneAuth = async () => {
    setIsLoading(true);
    try {
      if (!showOtpInput) {
        // Validate phone number
        if (!phoneNumber || phoneNumber.length < 10) {
          toast({
            title: "Invalid Phone Number",
            description: "Please enter a valid phone number",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        // Combine country code and phone number
        const fullNumber = `${selectedCountry.dialCode}${phoneNumber}`;
        setFullPhoneNumber(fullNumber);

        // Send OTP using backend proxy
        const response = await fetch(`${BACKEND_URL}/api/send-otp`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ phone: fullNumber }),
        });

        const data = await response.json();
        
        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to send OTP");
        }
        
        setShowOtpInput(true);
        setTimer(30); // 30 second timer
        toast({
          title: "OTP Sent",
          description: "Check your phone for the verification code.",
        });
      } else {
        // Validate OTP
        if (!otp || otp.length !== 4) {
          toast({
            title: "Invalid OTP",
            description: "Please enter the 4-digit OTP",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        // Verify OTP using backend proxy
        const response = await fetch(`${BACKEND_URL}/api/verify-otp`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ phone: fullPhoneNumber, code: otp }),
        });

        const data = await response.json();
        
        if (!response.ok || !data.success) {
          throw new Error(data.error || "Invalid OTP");
        }

        // OTP verified successfully - create user session
        const userData = {
          phone: fullPhoneNumber,
          verified: true,
          timestamp: Date.now(),
        };
        
        // Store in localStorage for session persistence
        localStorage.setItem("phoneAuth", JSON.stringify(userData));
        localStorage.setItem("userPhone", fullPhoneNumber);

        toast({
          title: "Success!",
          description: "You've successfully logged in.",
        });

        navigate("/");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred with phone authentication",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (timer > 0) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone: fullPhoneNumber }),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setTimer(30);
        setOtp("");
        toast({
          title: "OTP Resent",
          description: "New code sent to your phone.",
        });
      } else {
        throw new Error(data.error || "Failed to resend OTP");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to resend OTP",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-accent/10">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Welcome</CardTitle>
          <CardDescription className="text-center">
            Sign in to your account or create a new one
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Select
                value={selectedCountry.code}
                onValueChange={(value) => {
                  const country = countryCodes.find((c) => c.code === value);
                  if (country) setSelectedCountry(country);
                }}
                disabled={isLoading || showOtpInput}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <span>{selectedCountry.flag}</span>
                      <span>{selectedCountry.name}</span>
                      <span className="text-muted-foreground">{selectedCountry.dialCode}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {countryCodes.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      <span className="flex items-center gap-2">
                        <span>{country.flag}</span>
                        <span>{country.name}</span>
                        <span className="text-muted-foreground">{country.dialCode}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-3 py-2 bg-muted rounded-md text-sm text-muted-foreground">
                  {selectedCountry.flag} {selectedCountry.dialCode}
                </div>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="9876543210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                  disabled={isLoading || showOtpInput}
                  className="flex-1"
                />
              </div>
            </div>
            
            {showOtpInput && (
              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <div className="flex justify-center">
                  <InputOTP
                    value={otp}
                    onChange={(value) => setOtp(value)}
                    maxLength={4}
                    disabled={isLoading}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  Enter the 4-digit code sent to your phone
                </p>
              </div>
            )}

            <Button
              onClick={handlePhoneAuth}
              disabled={isLoading || !phoneNumber || (showOtpInput && otp.length !== 4)}
              className="w-full"
            >
              {isLoading ? "Loading..." : showOtpInput ? "Verify Code" : "Send Code"}
            </Button>

            {showOtpInput && (
              <div className="space-y-2">
                {timer > 0 ? (
                  <p className="text-center text-sm text-muted-foreground">
                    Resend code in {timer}s
                  </p>
                ) : (
                  <Button
                    onClick={handleResendOtp}
                    variant="outline"
                    className="w-full"
                    disabled={isLoading}
                  >
                    Resend OTP
                  </Button>
                )}
                
                <Button
                  onClick={() => {
                    setShowOtpInput(false);
                    setOtp("");
                    setPhoneNumber("");
                    setTimer(0);
                  }}
                  variant="ghost"
                  className="w-full"
                  disabled={isLoading}
                >
                  Use Different Number
                </Button>
              </div>
            )}

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <Button
            onClick={handleGoogleAuth}
            disabled={isLoading}
            variant="outline"
            className="w-full"
          >
            <Chrome className="mr-2 h-4 w-4" />
            Sign in with Google
          </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
