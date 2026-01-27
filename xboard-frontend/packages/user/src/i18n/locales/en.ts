export default {
  common: {
    retry: 'Retry',
    close: 'Close',
    confirm: 'Confirm',
    cancel: 'Cancel',
    save: 'Save',
    loading: 'Loading...',
    success: 'Success',
    error: 'Error',
  },
  nav: {
    dashboard: 'Dashboard',
    plans: 'Plans',
    subscription: 'Subscription',
    orders: 'Orders',
    traffic: 'Traffic',
    tickets: 'Tickets',
    knowledge: 'Knowledge',
    referral: 'Referral',
    settings: 'Settings',
    support: 'Support',
  },
  footer: {
    about: 'About',
    aboutText: 'XBoard provides secure and reliable proxy services for your needs.',
    quickLinks: 'Quick Links',
    dashboard: 'Dashboard',
    plans: 'Plans',
    subscription: 'Subscription',
    knowledge: 'Knowledge Base',
    support: 'Support',
    legal: 'Legal',
    terms: 'Terms of Service',
    privacy: 'Privacy Policy',
    followUs: 'Follow Us',
    copyright: '© 2024 XBoard. All rights reserved.',
  },
  userMenu: {
    dashboard: 'Dashboard',
    settings: 'Account Settings',
    logout: 'Logout',
  },
  dashboard: {
    title: 'Dashboard',
    subtitle: 'Welcome back! Here\'s an overview of your account',
    overview: {
      title: 'Account Overview',
      active: 'Active',
      inactive: 'Inactive',
      subscription: 'Subscription',
      planActive: 'Active Plan',
      noPlan: 'No Active Plan',
      expiresAt: 'Expires',
      traffic: 'Traffic Usage',
      balance: 'Account Balance',
      commission: 'Commission Balance'
    },
    quickActions: {
      title: 'Quick Actions',
      renewSubscription: 'Renew Subscription',
      viewSubscription: 'View Subscription',
      viewTraffic: 'View Traffic',
      referFriends: 'Refer Friends',
      browseSharedPlans: 'Browse Shared Plans',
      mySubscriptions: 'My Subscriptions'
    },
    recentOrders: {
      title: 'Recent Orders',
      viewAll: 'View All',
      empty: 'No orders yet',
      fetchError: 'Failed to load orders',
      status: {
        pending: 'Pending',
        processing: 'Processing',
        cancelled: 'Cancelled',
        completed: 'Completed',
        discounted: 'Discounted',
        unknown: 'Unknown'
      }
    },
    notices: {
      title: 'Announcements',
      empty: 'No announcements',
      fetchError: 'Failed to load announcements'
    }
  },
  home: {
    hero: {
      title: 'Secure, Fast, and Reliable Proxy Service',
      subtitle: 'Experience the internet without boundaries. Connect to our global network of high-speed servers with military-grade encryption.',
      welcomeBack: 'Welcome back',
      welcomeBackSubtitle: 'Manage your account and browse available plans',
      getStarted: 'Get Started',
      viewPlans: 'View Plans'
    },
    features: {
      title: 'Why Choose XBoard',
      subtitle: 'Everything you need for a secure and fast internet experience',
      items: {
        security: {
          title: 'Military-Grade Security',
          description: 'Your data is protected with AES-256 encryption and secure protocols'
        },
        speed: {
          title: 'Lightning Fast',
          description: 'Optimized servers worldwide for maximum speed and minimal latency'
        },
        global: {
          title: 'Global Network',
          description: 'Access content from anywhere with our worldwide server locations'
        },
        privacy: {
          title: 'Complete Privacy',
          description: 'No logs policy ensures your online activity remains private'
        }
      }
    },
    pricing: {
      title: 'Choose Your Plan',
      subtitle: 'Flexible pricing options to suit your needs',
      popular: 'Most Popular',
      perMonth: '/month',
      selectPlan: 'Select Plan'
    },
    testimonials: {
      title: 'What Our Users Say',
      subtitle: 'Join thousands of satisfied customers worldwide'
    },
    faq: {
      title: 'Frequently Asked Questions',
      subtitle: 'Find answers to common questions',
      items: {
        whatIs: {
          question: 'What is XBoard?',
          answer: 'XBoard is a premium proxy service that provides secure, fast, and reliable internet access through our global network of servers.'
        },
        howToStart: {
          question: 'How do I get started?',
          answer: 'Simply sign up for an account, choose a plan that suits your needs, and follow our setup guide to connect your devices.'
        },
        devices: {
          question: 'How many devices can I use?',
          answer: 'The number of devices depends on your plan. Basic plans support up to 5 devices, while Pro and Enterprise plans offer more.'
        },
        refund: {
          question: 'Do you offer refunds?',
          answer: 'Yes, we offer a 30-day money-back guarantee. If you\'re not satisfied, contact our support team for a full refund.'
        },
        support: {
          question: 'How can I get support?',
          answer: 'We offer 24/7 customer support through our ticket system. Premium plans also include priority support and live chat.'
        }
      }
    },
    cta: {
      title: 'Ready to Get Started?',
      subtitle: 'Join thousands of users who trust XBoard for their internet security',
      button: 'Create Account'
    },
    userInfo: {
      welcome: 'Welcome Back',
      subtitle: 'View your account status and available plans',
      balance: 'Balance',
      traffic: 'Remaining Traffic',
      goToDashboard: 'Go to Dashboard'
    }
  },
  login: {
    title: 'Welcome Back',
    subtitle: 'Sign in to your account',
    email: 'Email',
    emailPlaceholder: 'Enter your email',
    password: 'Password',
    passwordPlaceholder: 'Enter your password',
    rememberMe: 'Remember me',
    forgotPassword: 'Forgot password?',
    loginButton: 'Sign In',
    loggingIn: 'Signing in...',
    error: 'Login Failed',
    noAccount: "Don't have an account?",
    registerLink: 'Sign up',
    validation: {
      emailRequired: 'Email is required',
      emailInvalid: 'Please enter a valid email',
      passwordRequired: 'Password is required',
      passwordMinLength: 'Password must be at least 6 characters',
      loginFailed: 'Invalid email or password'
    }
  },
  register: {
    title: 'Create Account',
    subtitle: 'Sign up to get started',
    email: 'Email',
    emailPlaceholder: 'Enter your email',
    password: 'Password',
    passwordPlaceholder: 'Enter your password',
    confirmPassword: 'Confirm Password',
    confirmPasswordPlaceholder: 'Confirm your password',
    inviteCode: 'Invite Code',
    inviteCodePlaceholder: 'Enter invite code (optional)',
    registerButton: 'Sign Up',
    registering: 'Creating account...',
    error: 'Registration Failed',
    success: 'Registration Successful',
    successMessage: 'Your account has been created. Please sign in.',
    haveAccount: 'Already have an account?',
    loginLink: 'Sign in',
    validation: {
      emailRequired: 'Email is required',
      emailInvalid: 'Please enter a valid email',
      passwordRequired: 'Password is required',
      passwordMinLength: 'Password must be at least 8 characters',
      confirmPasswordRequired: 'Please confirm your password',
      passwordMismatch: 'Passwords do not match',
      registerFailed: 'Registration failed. Please try again.'
    }
  },
  forgotPassword: {
    title: 'Reset Password',
    subtitle: 'Enter your email to receive reset instructions',
    email: 'Email',
    emailPlaceholder: 'Enter your email',
    sendButton: 'Send Reset Link',
    sending: 'Sending...',
    success: 'Email Sent',
    successMessage: 'Password reset instructions have been sent to your email.',
    backToLogin: 'Back to login',
    validation: {
      emailRequired: 'Email is required',
      emailInvalid: 'Please enter a valid email'
    }
  },
  resetPassword: {
    title: 'Reset Password',
    subtitle: 'Enter your new password',
    password: 'New Password',
    passwordPlaceholder: 'Enter new password',
    confirmPassword: 'Confirm Password',
    confirmPasswordPlaceholder: 'Confirm new password',
    resetButton: 'Reset Password',
    resetting: 'Resetting...',
    success: 'Password Reset',
    successMessage: 'Your password has been reset successfully.',
    validation: {
      passwordRequired: 'Password is required',
      passwordMinLength: 'Password must be at least 8 characters',
      confirmPasswordRequired: 'Please confirm your password',
      passwordMismatch: 'Passwords do not match'
    }
  },
  plans: {
    title: 'Choose Your Plan',
    subtitle: 'Select the perfect plan for your needs',
    loading: 'Loading plans...',
    retry: 'Retry',
    fetchError: 'Failed to load plans',
    noPlans: 'No plans available',
    featured: 'Featured',
    month: 'month',
    quarterly: 'Quarterly',
    halfYearly: 'Half Year',
    yearly: 'Yearly',
    traffic: 'Traffic',
    speed: 'Speed Limit',
    devices: 'Devices',
    resetDay: 'Reset Day',
    noReset: 'No Reset',
    subscribe: 'Subscribe Now',
    currentPlan: 'Current Plan',
    popular: 'Most Popular',
    features: 'Features',
    unlimited: 'Unlimited',
    selectPlan: 'Select Plan',
    view: {
      cards: 'Card View',
      comparison: 'Comparison View'
    },
    comparison: {
      feature: 'Feature',
      price: 'Price',
      traffic: 'Traffic',
      speed: 'Speed',
      devices: 'Devices',
      action: 'Action'
    },
    periods: {
      month: 'Monthly',
      quarter: 'Quarterly',
      half_year: '6 Months',
      year: 'Yearly',
      two_year: '2 Years',
      three_year: '3 Years',
      onetime: 'One-time',
      reset: 'Traffic Reset'
    },
    coupon: {
      title: 'Have a coupon code?',
      placeholder: 'Enter coupon code',
      apply: 'Apply',
      applied: 'Coupon applied',
      appliedMessage: 'Coupon applied! You save {discount}',
      invalid: 'Invalid coupon code',
      remove: 'Remove',
      validating: 'Validating...'
    },
    pricing: {
      original: 'Original Price',
      discount: 'Discount',
      total: 'Total',
      perMonth: '/month',
      save: 'Save'
    },
    checkout: 'Proceed to Checkout',
    noPriceAvailable: 'No pricing available for this plan',
    subscribeError: 'Failed to subscribe, please try again'
  },
  notFound: {
    message: 'Page not found',
    goHome: 'Go Home'
  },
  referral: {
    title: 'Referral Program',
    subtitle: 'Invite friends and earn commissions on their purchases'
  },
  checkout: {
    title: 'Checkout',
    subtitle: 'Complete your purchase',
    planFeatures: {
      title: 'Plan Features',
      traffic: 'Traffic',
      speed: 'Speed',
      devices: 'Devices',
      unlimited: 'Unlimited',
      unlimitedDevices: 'Unlimited Devices'
    },
    orderSummary: {
      title: 'Order Summary',
      plan: 'Plan',
      period: 'Period',
      price: 'Price',
      discount: 'Discount',
      total: 'Total'
    },
    payment: {
      title: 'Payment Method',
      select: 'Select payment method',
      processing: 'Processing payment...',
      error: 'Payment failed',
      success: 'Payment successful',
      confirmTitle: 'Confirm Payment',
      confirmMessage: 'You are about to pay ${amount}. Continue?'
    },
    buttons: {
      back: 'Back to Plans',
      pay: 'Pay Now',
      cancel: 'Cancel',
      viewPlans: 'View Plans'
    }
  },
  paymentCallback: {
    processing: {
      title: 'Processing Payment',
      message: 'Please wait while we verify your payment...'
    },
    success: {
      title: 'Payment Successful!',
      message: 'Your subscription has been activated.',
      viewSubscription: 'View Subscription',
      viewOrders: 'View Orders'
    },
    failed: {
      title: 'Payment Failed',
      message: 'We could not process your payment.',
      retry: 'Try Again',
      viewOrders: 'View Orders'
    },
    cancelled: {
      title: 'Payment Cancelled',
      message: 'You cancelled the payment process.',
      browsePlans: 'Browse Plans',
      viewOrders: 'View Orders'
    }
  },
  orders: {
    title: 'My Orders',
    subtitle: 'View and manage your orders',
    loading: 'Loading orders...',
    error: 'Failed to load orders',
    noOrders: 'No orders yet',
    viewPlans: 'View Plans',
    table: {
      orderNo: 'Order No.',
      plan: 'Plan',
      period: 'Period',
      amount: 'Amount',
      status: 'Status',
      date: 'Date',
      actions: 'Actions'
    },
    status: {
      pending: 'Pending',
      processing: 'Processing',
      cancelled: 'Cancelled',
      completed: 'Completed',
      discounted: 'Discounted'
    },
    actions: {
      view: 'View Details',
      pay: 'Pay Now',
      cancel: 'Cancel Order',
      retry: 'Retry Payment'
    },
    detail: {
      title: 'Order Details',
      orderNo: 'Order Number',
      tradeNo: 'Trade Number',
      plan: 'Plan',
      period: 'Period',
      totalAmount: 'Total Amount',
      discountAmount: 'Discount',
      balanceAmount: 'Balance Used',
      surplusAmount: 'Surplus',
      status: 'Status',
      createdAt: 'Created',
      updatedAt: 'Updated',
      close: 'Close'
    },
    cancel: {
      confirm: 'Are you sure you want to cancel this order?',
      success: 'Order cancelled successfully',
      error: 'Failed to cancel order'
    }
  },
  subscription: {
    title: 'Subscription',
    subtitle: 'Manage your subscription and access',
    loading: 'Loading subscription...',
    error: 'Failed to load subscription',
    noSubscription: 'No active subscription',
    subscriptionLink: {
      title: 'Subscription Link',
      description: 'Use this link to configure your client applications',
      copy: 'Copy Link',
      copied: 'Copied!',
      qrCode: 'QR Code',
      showQR: 'Show QR Code',
      hideQR: 'Hide QR Code',
      scanQR: 'Scan with your mobile device'
    },
    subscriptionInfo: {
      title: 'Subscription Information',
      plan: 'Current Plan',
      status: 'Status',
      active: 'Active',
      expired: 'Expired',
      expiresAt: 'Expires',
      daysRemaining: 'days remaining',
      traffic: 'Traffic',
      used: 'Used',
      remaining: 'Remaining',
      total: 'Total',
      resetDay: 'Reset Day',
      everyMonth: 'Every month on day'
    },
    resetSecret: {
      button: 'Reset Subscription Secret',
      confirm: 'Are you sure you want to reset your subscription secret? Your current subscription link will stop working.',
      success: 'Subscription secret reset successfully',
      error: 'Failed to reset subscription secret',
      warning: 'Warning: This will invalidate your current subscription link'
    },
    serverNodes: {
      title: 'Available Servers',
      description: 'Connect to any of these servers using your subscription link',
      noServers: 'No servers available',
      region: 'Region',
      name: 'Server Name',
      status: 'Status',
      online: 'Online',
      offline: 'Offline',
      rate: 'Rate'
    },
    clientConfig: {
      title: 'Client Configuration',
      description: 'Setup guides for different platforms',
      platforms: {
        ios: 'iOS',
        android: 'Android',
        windows: 'Windows',
        macos: 'macOS',
        linux: 'Linux'
      },
      steps: {
        download: 'Download and install the client',
        import: 'Import subscription link',
        connect: 'Select a server and connect'
      },
      recommendedClients: 'Recommended Clients'
    }
  },
  traffic: {
    title: 'Traffic Usage',
    subtitle: 'Monitor your data usage',
    loading: 'Loading traffic data...',
    error: 'Failed to load traffic data',
    overview: {
      title: 'Current Usage',
      upload: 'Upload',
      download: 'Download',
      total: 'Total',
      remaining: 'Remaining',
      quota: 'Quota',
      percentage: 'Used'
    },
    stats: {
      title: 'Statistics',
      today: 'Today',
      yesterday: 'Yesterday',
      thisMonth: 'This Month',
      lastMonth: 'Last Month'
    },
    chart: {
      title: 'Traffic History',
      upload: 'Upload',
      download: 'Download',
      total: 'Total',
      date: 'Date',
      noData: 'No data available'
    },
    breakdown: {
      title: 'Usage by Server',
      server: 'Server',
      upload: 'Upload',
      download: 'Download',
      total: 'Total',
      percentage: 'Percentage',
      noData: 'No data available'
    },
    filters: {
      title: 'Filters',
      dateRange: 'Date Range',
      startDate: 'Start Date',
      endDate: 'End Date',
      server: 'Server',
      allServers: 'All Servers',
      apply: 'Apply',
      clear: 'Clear',
      last7Days: 'Last 7 Days',
      last30Days: 'Last 30 Days',
      thisMonth: 'This Month',
      lastMonth: 'Last Month'
    },
    resetInfo: {
      title: 'Traffic Reset',
      nextReset: 'Next Reset',
      resetDay: 'Reset Day',
      description: 'Your traffic quota will be reset on'
    }
  },
  giftCards: {
    title: 'Gift Cards',
    subtitle: 'Redeem gift cards to add balance or traffic to your account',
    redeemTitle: 'Redeem Gift Card',
    codeLabel: 'Gift Card Code',
    type: 'Type',
    typeBalance: 'Balance',
    typeTraffic: 'Traffic'
  },
  settings: {
    title: 'Account Settings',
    subtitle: 'Manage your account preferences and security',
    profile: {
      title: 'Profile Information',
      description: 'View your account information',
      email: 'Email Address',
      emailPlaceholder: 'your@email.com',
      userId: 'User ID',
      memberSince: 'Member Since'
    },
    password: {
      title: 'Change Password',
      description: 'Update your password to keep your account secure',
      current: 'Current Password',
      currentPlaceholder: 'Enter current password',
      new: 'New Password',
      newPlaceholder: 'Enter new password',
      confirm: 'Confirm New Password',
      confirmPlaceholder: 'Confirm new password',
      submit: 'Change Password',
      success: 'Password changed successfully',
      error: 'Failed to change password',
      currentRequired: 'Current password is required',
      newRequired: 'New password is required',
      confirmRequired: 'Please confirm your password',
      minLength: 'Password must be at least 8 characters',
      mismatch: 'Passwords do not match'
    },
    email: {
      title: 'Update Email',
      description: 'Change your email address',
      current: 'Current Email',
      new: 'New Email Address',
      newPlaceholder: 'Enter new email',
      password: 'Password',
      passwordPlaceholder: 'Enter your password to confirm',
      submit: 'Update Email',
      success: 'Email updated successfully',
      error: 'Failed to update email',
      newRequired: 'New email is required',
      invalid: 'Please enter a valid email',
      passwordRequired: 'Password is required to update email'
    },
    notifications: {
      title: 'Notification Preferences',
      description: 'Choose what notifications you want to receive',
      orderUpdates: 'Order Updates',
      orderUpdatesDesc: 'Get notified about order status changes',
      trafficAlerts: 'Traffic Alerts',
      trafficAlertsDesc: 'Receive alerts when traffic usage is high',
      systemAnnouncements: 'System Announcements',
      systemAnnouncementsDesc: 'Important updates and maintenance notices',
      promotions: 'Promotions & Offers',
      promotionsDesc: 'Special deals and promotional offers',
      save: 'Save Preferences',
      success: 'Notification preferences saved',
      error: 'Failed to save preferences'
    },
    sessions: {
      title: 'Active Sessions',
      description: 'Manage devices that are currently logged into your account',
      empty: 'No active sessions',
      unknownDevice: 'Unknown Device',
      current: 'Current Session',
      lastActive: 'Last active',
      revoke: 'Revoke',
      revokeAll: 'Revoke All Other Sessions',
      revokeSuccess: 'Session revoked successfully',
      revokeError: 'Failed to revoke session',
      revokeAllSuccess: 'All other sessions revoked',
      revokeAllError: 'Failed to revoke sessions',
      fetchError: 'Failed to load sessions'
    }
  },
  sharedPlans: {
    title: 'Shared Plans',
    subtitle: 'Browse and purchase shared subscription plans',
    noPlans: 'No shared plans available',
    nodes: 'Nodes',
    traffic: 'Traffic',
    duration: 'Duration',
    days: 'days',
    availability: 'Availability',
    slotsAvailable: 'slots available',
    full: 'Full',
    soldOut: 'Sold Out',
    purchase: 'Purchase',
    confirmPurchase: 'Confirm Purchase',
    confirmPurchaseMessage: 'You are about to purchase "{name}" for ${price} ({period}). Continue?',
    purchaseSuccess: 'Plan purchased successfully!',
    purchaseFailed: 'Failed to purchase plan',
    trafficShared: 'Traffic is shared by all users',
    serverGroup: 'Server Group',
    selectPeriod: 'Select Subscription Period',
    selectPeriodFirst: 'Please select a subscription period first',
    invalidPeriod: 'Invalid subscription period',
    recommended: 'Recommended',
    avgMonthly: 'Avg/Month',
    permanent: 'Permanent',
    mySubscriptions: {
      title: 'My Shared Subscriptions',
      subtitle: 'Manage your shared subscription plans',
      noSubscriptions: 'No shared subscriptions',
      subscriptionUrl: 'Subscription URL',
      copy: 'Copy',
      copied: 'Copied!',
      status: 'Status',
      active: 'Active',
      expired: 'Expired',
      expiresAt: 'Expires',
      traffic: 'Traffic',
      shared: 'Shared',
      nodes: 'Nodes',
      format: 'Format',
      viewDetails: 'View Details'
    }
  }
}
