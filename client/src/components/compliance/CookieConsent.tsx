/**
 * Cookie Consent Banner
 * 
 * GDPR-compliant cookie consent banner that allows users to:
 * - Accept or reject non-essential cookies
 * - Customize cookie preferences by category
 * - View cookie policy
 * - Change preferences at any time
 */

import { useState, useEffect } from 'react';
import { X, Cookie, Settings } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';

interface CookiePreferences {
  essential: boolean; // Always true, cannot be disabled
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

const DEFAULT_PREFERENCES: CookiePreferences = {
  essential: true,
  functional: false,
  analytics: false,
  marketing: false,
};

const COOKIE_CONSENT_KEY = 'linguamaster_cookie_consent';
const COOKIE_PREFERENCES_KEY = 'linguamaster_cookie_preferences';

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Show banner after a short delay for better UX
      setTimeout(() => setShowBanner(true), 1000);
    } else {
      // Load saved preferences
      const savedPreferences = localStorage.getItem(COOKIE_PREFERENCES_KEY);
      if (savedPreferences) {
        try {
          setPreferences(JSON.parse(savedPreferences));
        } catch (error) {
          console.error('Failed to parse cookie preferences:', error);
        }
      }
    }
  }, []);

  const savePreferences = (prefs: CookiePreferences) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(prefs));
    setPreferences(prefs);
    
    // Apply preferences (in a real app, this would enable/disable tracking scripts)
    applyPreferences(prefs);
  };

  const applyPreferences = (prefs: CookiePreferences) => {
    // Essential cookies are always enabled
    
    // Functional cookies (e.g., language preference, theme)
    if (!prefs.functional) {
      // Disable functional cookies
      console.log('Functional cookies disabled');
    }
    
    // Analytics cookies (e.g., Google Analytics)
    if (!prefs.analytics) {
      // Disable analytics
      console.log('Analytics cookies disabled');
      // Example: window.gtag && window.gtag('consent', 'update', { analytics_storage: 'denied' });
    } else {
      console.log('Analytics cookies enabled');
      // Example: window.gtag && window.gtag('consent', 'update', { analytics_storage: 'granted' });
    }
    
    // Marketing cookies (e.g., advertising, social media)
    if (!prefs.marketing) {
      // Disable marketing cookies
      console.log('Marketing cookies disabled');
    }
  };

  const handleAcceptAll = () => {
    const allAccepted: CookiePreferences = {
      essential: true,
      functional: true,
      analytics: true,
      marketing: true,
    };
    savePreferences(allAccepted);
    setShowBanner(false);
  };

  const handleRejectAll = () => {
    savePreferences(DEFAULT_PREFERENCES);
    setShowBanner(false);
  };

  const handleSaveCustom = () => {
    savePreferences(preferences);
    setShowSettings(false);
    setShowBanner(false);
  };

  const handleOpenSettings = () => {
    setShowSettings(true);
  };

  if (!showBanner) {
    return null;
  }

  return (
    <>
      {/* Cookie Consent Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-lg">
        <div className="container mx-auto px-4 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <Cookie className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  We value your privacy
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  We use cookies to enhance your learning experience, analyze site traffic,
                  and personalize content. You can customize your preferences or accept all cookies.
                  {' '}
                  <a
                    href="/privacy-policy"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Learn more
                  </a>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenSettings}
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Customize
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRejectAll}
              >
                Reject All
              </Button>
              <Button
                size="sm"
                onClick={handleAcceptAll}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Accept All
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Cookie Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cookie className="w-5 h-5" />
              Cookie Preferences
            </DialogTitle>
            <DialogDescription>
              Manage your cookie preferences. Essential cookies are always enabled
              as they are necessary for the website to function properly.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Essential Cookies */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label className="text-base font-semibold">
                    Essential Cookies
                  </Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Required for the website to function. These cookies enable core
                    functionality such as security, authentication, and accessibility.
                    They cannot be disabled.
                  </p>
                </div>
                <Switch
                  checked={true}
                  disabled={true}
                  className="ml-4"
                />
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500 pl-4">
                Examples: Session cookies, authentication tokens, security cookies
              </div>
            </div>

            {/* Functional Cookies */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label htmlFor="functional" className="text-base font-semibold">
                    Functional Cookies
                  </Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Enable enhanced functionality and personalization, such as
                    remembering your language preference, theme, and learning settings.
                  </p>
                </div>
                <Switch
                  id="functional"
                  checked={preferences.functional}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, functional: checked })
                  }
                  className="ml-4"
                />
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500 pl-4">
                Examples: Language preference, theme selection, UI customization
              </div>
            </div>

            {/* Analytics Cookies */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label htmlFor="analytics" className="text-base font-semibold">
                    Analytics Cookies
                  </Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Help us understand how you use our platform so we can improve
                    your learning experience. All data is anonymized.
                  </p>
                </div>
                <Switch
                  id="analytics"
                  checked={preferences.analytics}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, analytics: checked })
                  }
                  className="ml-4"
                />
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500 pl-4">
                Examples: Google Analytics, usage statistics, performance monitoring
              </div>
            </div>

            {/* Marketing Cookies */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label htmlFor="marketing" className="text-base font-semibold">
                    Marketing Cookies
                  </Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Used to deliver personalized advertisements and track campaign
                    effectiveness. These cookies may be set by third-party advertisers.
                  </p>
                </div>
                <Switch
                  id="marketing"
                  checked={preferences.marketing}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, marketing: checked })
                  }
                  className="ml-4"
                />
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500 pl-4">
                Examples: Advertising cookies, social media tracking, remarketing
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <a
              href="/cookie-policy"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              View Cookie Policy
            </a>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowSettings(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveCustom}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Save Preferences
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Cookie Settings Button
 * 
 * Allows users to change their cookie preferences at any time.
 * Place this in the footer or settings page.
 */
export function CookieSettingsButton() {
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    const savedPreferences = localStorage.getItem(COOKIE_PREFERENCES_KEY);
    if (savedPreferences) {
      try {
        setPreferences(JSON.parse(savedPreferences));
      } catch (error) {
        console.error('Failed to parse cookie preferences:', error);
      }
    }
  }, []);

  const savePreferences = (prefs: CookiePreferences) => {
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(prefs));
    setPreferences(prefs);
  };

  const handleSaveCustom = () => {
    savePreferences(preferences);
    setShowSettings(false);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowSettings(true)}
        className="flex items-center gap-2"
      >
        <Cookie className="w-4 h-4" />
        Cookie Settings
      </Button>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cookie className="w-5 h-5" />
              Cookie Preferences
            </DialogTitle>
            <DialogDescription>
              Manage your cookie preferences. Changes will take effect immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Essential Cookies */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label className="text-base font-semibold">
                    Essential Cookies
                  </Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Required for the website to function properly.
                  </p>
                </div>
                <Switch checked={true} disabled={true} className="ml-4" />
              </div>
            </div>

            {/* Functional Cookies */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label htmlFor="functional-settings" className="text-base font-semibold">
                    Functional Cookies
                  </Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Enhanced functionality and personalization.
                  </p>
                </div>
                <Switch
                  id="functional-settings"
                  checked={preferences.functional}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, functional: checked })
                  }
                  className="ml-4"
                />
              </div>
            </div>

            {/* Analytics Cookies */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label htmlFor="analytics-settings" className="text-base font-semibold">
                    Analytics Cookies
                  </Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Help us improve your experience.
                  </p>
                </div>
                <Switch
                  id="analytics-settings"
                  checked={preferences.analytics}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, analytics: checked })
                  }
                  className="ml-4"
                />
              </div>
            </div>

            {/* Marketing Cookies */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label htmlFor="marketing-settings" className="text-base font-semibold">
                    Marketing Cookies
                  </Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Personalized advertisements.
                  </p>
                </div>
                <Switch
                  id="marketing-settings"
                  checked={preferences.marketing}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, marketing: checked })
                  }
                  className="ml-4"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveCustom}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Save Preferences
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
