export default {
  common: {
    retry: '重试',
    close: '关闭',
    confirm: '确认',
    cancel: '取消',
    save: '保存',
    loading: '加载中...',
    success: '成功',
    error: '错误',
  },
  nav: {
    dashboard: '仪表板',
    plans: '套餐',
    subscription: '订阅',
    orders: '订单',
    traffic: '流量',
    tickets: '工单',
    knowledge: '知识库',
    referral: '推荐',
    settings: '设置',
    support: '支持',
  },
  footer: {
    about: '关于',
    aboutText: 'XBoard 为您提供安全可靠的代理服务。',
    quickLinks: '快速链接',
    dashboard: '仪表板',
    plans: '套餐',
    subscription: '订阅',
    knowledge: '知识库',
    support: '支持',
    legal: '法律',
    terms: '服务条款',
    privacy: '隐私政策',
    followUs: '关注我们',
    copyright: '© 2024 XBoard. 保留所有权利。',
  },
  userMenu: {
    dashboard: '仪表板',
    settings: '账户设置',
    logout: '退出登录',
  },
  dashboard: {
    title: '仪表板',
    subtitle: '欢迎回来！这是您账户的概览',
    overview: {
      title: '账户概览',
      active: '活跃',
      inactive: '未激活',
      subscription: '订阅',
      planActive: '活跃套餐',
      noPlan: '无活跃套餐',
      expiresAt: '到期时间',
      traffic: '流量使用',
      balance: '账户余额',
      commission: '佣金余额'
    },
    quickActions: {
      title: '快捷操作',
      renewSubscription: '续费订阅',
      viewSubscription: '查看订阅',
      viewTraffic: '查看流量',
      referFriends: '推荐好友',
      browseSharedPlans: '浏览共享套餐',
      mySubscriptions: '我的订阅'
    },
    recentOrders: {
      title: '最近订单',
      viewAll: '查看全部',
      empty: '暂无订单',
      fetchError: '加载订单失败',
      status: {
        pending: '待支付',
        processing: '处理中',
        cancelled: '已取消',
        completed: '已完成',
        discounted: '已折扣',
        unknown: '未知'
      }
    },
    notices: {
      title: '公告',
      empty: '暂无公告',
      fetchError: '加载公告失败'
    }
  },
  home: {
    hero: {
      title: '安全、快速、可靠的代理服务',
      subtitle: '体验无界互联网。连接我们的全球高速服务器网络，享受军事级加密保护。',
      welcomeBack: '欢迎回来',
      welcomeBackSubtitle: '查看账户信息并浏览可用套餐',
      getStarted: '立即开始',
      viewPlans: '查看套餐'
    },
    features: {
      title: '为什么选择 XBoard',
      subtitle: '为您提供安全快速的互联网体验所需的一切',
      items: {
        security: {
          title: '军事级安全',
          description: '您的数据受到 AES-256 加密和安全协议的保护'
        },
        speed: {
          title: '闪电般快速',
          description: '全球优化服务器，实现最高速度和最低延迟'
        },
        global: {
          title: '全球网络',
          description: '通过我们遍布全球的服务器位置访问任何内容'
        },
        privacy: {
          title: '完全隐私',
          description: '无日志政策确保您的在线活动保持私密'
        }
      }
    },
    pricing: {
      title: '选择您的套餐',
      subtitle: '灵活的定价选项，满足您的需求',
      popular: '最受欢迎',
      perMonth: '/月',
      selectPlan: '选择套餐'
    },
    testimonials: {
      title: '用户评价',
      subtitle: '加入全球数千名满意的客户'
    },
    faq: {
      title: '常见问题',
      subtitle: '查找常见问题的答案',
      items: {
        whatIs: {
          question: '什么是 XBoard？',
          answer: 'XBoard 是一项高级代理服务，通过我们的全球服务器网络提供安全、快速和可靠的互联网访问。'
        },
        howToStart: {
          question: '如何开始使用？',
          answer: '只需注册一个账户，选择适合您需求的套餐，然后按照我们的设置指南连接您的设备。'
        },
        devices: {
          question: '我可以使用多少台设备？',
          answer: '设备数量取决于您的套餐。基础套餐支持最多 5 台设备，而专业版和企业版套餐提供更多。'
        },
        refund: {
          question: '你们提供退款吗？',
          answer: '是的，我们提供 30 天退款保证。如果您不满意，请联系我们的支持团队获得全额退款。'
        },
        support: {
          question: '如何获得支持？',
          answer: '我们通过工单系统提供 24/7 客户支持。高级套餐还包括优先支持和在线聊天。'
        }
      }
    },
    cta: {
      title: '准备好开始了吗？',
      subtitle: '加入数千名信任 XBoard 保护其互联网安全的用户',
      button: '创建账户'
    },
    userInfo: {
      welcome: '欢迎回来',
      subtitle: '查看您的账户状态和可用套餐',
      balance: '账户余额',
      traffic: '剩余流量',
      goToDashboard: '进入控制台'
    }
  },
  login: {
    title: '欢迎回来',
    subtitle: '登录您的账户',
    email: '邮箱',
    emailPlaceholder: '请输入邮箱',
    password: '密码',
    passwordPlaceholder: '请输入密码',
    rememberMe: '记住我',
    forgotPassword: '忘记密码？',
    loginButton: '登录',
    loggingIn: '登录中...',
    error: '登录失败',
    noAccount: '还没有账户？',
    registerLink: '注册',
    validation: {
      emailRequired: '邮箱不能为空',
      emailInvalid: '请输入有效的邮箱地址',
      passwordRequired: '密码不能为空',
      passwordMinLength: '密码至少需要6个字符',
      loginFailed: '邮箱或密码错误'
    }
  },
  register: {
    title: '创建账户',
    subtitle: '注册开始使用',
    email: '邮箱',
    emailPlaceholder: '请输入邮箱',
    password: '密码',
    passwordPlaceholder: '请输入密码',
    confirmPassword: '确认密码',
    confirmPasswordPlaceholder: '请再次输入密码',
    inviteCode: '邀请码',
    inviteCodePlaceholder: '请输入邀请码（可选）',
    registerButton: '注册',
    registering: '注册中...',
    error: '注册失败',
    success: '注册成功',
    successMessage: '您的账户已创建，请登录。',
    haveAccount: '已有账户？',
    loginLink: '登录',
    validation: {
      emailRequired: '邮箱不能为空',
      emailInvalid: '请输入有效的邮箱地址',
      passwordRequired: '密码不能为空',
      passwordMinLength: '密码至少需要8个字符',
      confirmPasswordRequired: '请确认密码',
      passwordMismatch: '两次输入的密码不一致',
      registerFailed: '注册失败，请重试。'
    }
  },
  forgotPassword: {
    title: '重置密码',
    subtitle: '输入您的邮箱以接收重置说明',
    email: '邮箱',
    emailPlaceholder: '请输入邮箱',
    sendButton: '发送重置链接',
    sending: '发送中...',
    success: '邮件已发送',
    successMessage: '密码重置说明已发送到您的邮箱。',
    backToLogin: '返回登录',
    validation: {
      emailRequired: '邮箱不能为空',
      emailInvalid: '请输入有效的邮箱地址'
    }
  },
  resetPassword: {
    title: '重置密码',
    subtitle: '输入您的新密码',
    password: '新密码',
    passwordPlaceholder: '请输入新密码',
    confirmPassword: '确认密码',
    confirmPasswordPlaceholder: '请再次输入新密码',
    resetButton: '重置密码',
    resetting: '重置中...',
    success: '密码已重置',
    successMessage: '您的密码已成功重置。',
    validation: {
      passwordRequired: '密码不能为空',
      passwordMinLength: '密码至少需要8个字符',
      confirmPasswordRequired: '请确认密码',
      passwordMismatch: '两次输入的密码不一致'
    }
  },
  plans: {
    title: '选择您的套餐',
    subtitle: '选择最适合您需求的套餐',
    loading: '加载套餐中...',
    retry: '重试',
    fetchError: '加载套餐失败',
    noPlans: '暂无可用套餐',
    featured: '推荐',
    month: '月',
    quarterly: '季付',
    halfYearly: '半年付',
    yearly: '年付',
    traffic: '流量',
    speed: '速度限制',
    devices: '设备数',
    resetDay: '重置日',
    noReset: '不重置',
    subscribe: '立即订阅',
    currentPlan: '当前套餐',
    popular: '最受欢迎',
    features: '功能',
    unlimited: '无限制',
    selectPlan: '选择套餐',
    view: {
      cards: '卡片视图',
      comparison: '对比视图'
    },
    comparison: {
      feature: '功能',
      price: '价格',
      traffic: '流量',
      speed: '速度',
      devices: '设备',
      action: '操作'
    },
    periods: {
      month: '月付',
      quarter: '季付',
      half_year: '半年付',
      year: '年付',
      two_year: '两年付',
      three_year: '三年付',
      onetime: '一次性',
      reset: '流量重置'
    },
    coupon: {
      title: '有优惠券吗？',
      placeholder: '请输入优惠券代码',
      apply: '应用',
      applied: '已应用优惠券',
      appliedMessage: '优惠券已应用！您节省了 {discount}',
      invalid: '无效的优惠券代码',
      remove: '移除',
      validating: '验证中...'
    },
    pricing: {
      original: '原价',
      discount: '折扣',
      total: '总计',
      perMonth: '/月',
      save: '节省'
    },
    checkout: '前往结算',
    noPriceAvailable: '该套餐暂无可用价格',
    subscribeError: '订阅失败，请重试'
  },
  notFound: {
    message: '页面未找到',
    goHome: '返回首页'
  },
  referral: {
    title: '推荐计划',
    subtitle: '邀请好友并赚取佣金'
  },
  checkout: {
    title: '结算',
    subtitle: '完成您的购买',
    planFeatures: {
      title: '套餐特性',
      traffic: '流量',
      speed: '速度',
      devices: '设备',
      unlimited: '无限制',
      unlimitedDevices: '无限设备'
    },
    orderSummary: {
      title: '订单摘要',
      plan: '套餐',
      period: '周期',
      price: '价格',
      discount: '折扣',
      total: '总计'
    },
    payment: {
      title: '支付方式',
      select: '选择支付方式',
      processing: '处理支付中...',
      error: '支付失败',
      success: '支付成功',
      confirmTitle: '确认支付',
      confirmMessage: '您即将支付 ¥{amount}。继续？'
    },
    buttons: {
      back: '返回套餐',
      pay: '立即支付',
      cancel: '取消',
      viewPlans: '查看套餐'
    }
  },
  paymentCallback: {
    processing: {
      title: '处理支付中',
      message: '请稍候，我们正在验证您的支付...'
    },
    success: {
      title: '支付成功！',
      message: '您的订阅已激活。',
      viewSubscription: '查看订阅',
      viewOrders: '查看订单'
    },
    failed: {
      title: '支付失败',
      message: '我们无法处理您的支付。',
      retry: '重试',
      viewOrders: '查看订单'
    },
    cancelled: {
      title: '支付已取消',
      message: '您取消了支付流程。',
      browsePlans: '浏览套餐',
      viewOrders: '查看订单'
    }
  },
  orders: {
    title: '我的订单',
    subtitle: '查看和管理您的订单',
    loading: '加载订单中...',
    error: '加载订单失败',
    noOrders: '暂无订单',
    viewPlans: '查看套餐',
    table: {
      orderNo: '订单号',
      plan: '套餐',
      period: '周期',
      amount: '金额',
      status: '状态',
      date: '日期',
      actions: '操作'
    },
    status: {
      pending: '待支付',
      processing: '处理中',
      cancelled: '已取消',
      completed: '已完成',
      discounted: '已折扣'
    },
    actions: {
      view: '查看详情',
      pay: '立即支付',
      cancel: '取消订单',
      retry: '重试支付'
    },
    detail: {
      title: '订单详情',
      orderNo: '订单号',
      tradeNo: '交易号',
      plan: '套餐',
      period: '周期',
      totalAmount: '总金额',
      discountAmount: '折扣',
      balanceAmount: '余额使用',
      surplusAmount: '剩余',
      status: '状态',
      createdAt: '创建时间',
      updatedAt: '更新时间',
      close: '关闭'
    },
    cancel: {
      confirm: '确定要取消此订单吗？',
      success: '订单已成功取消',
      error: '取消订单失败'
    }
  },
  subscription: {
    title: '订阅',
    subtitle: '管理您的订阅和访问',
    loading: '加载订阅中...',
    error: '加载订阅失败',
    noSubscription: '无活跃订阅',
    subscriptionLink: {
      title: '订阅链接',
      description: '使用此链接配置您的客户端应用程序',
      copy: '复制链接',
      copied: '已复制！',
      qrCode: '二维码',
      showQR: '显示二维码',
      hideQR: '隐藏二维码',
      scanQR: '使用移动设备扫描'
    },
    subscriptionInfo: {
      title: '订阅信息',
      plan: '当前套餐',
      status: '状态',
      active: '活跃',
      expired: '已过期',
      expiresAt: '到期时间',
      daysRemaining: '天剩余',
      traffic: '流量',
      used: '已使用',
      remaining: '剩余',
      total: '总计',
      resetDay: '重置日',
      everyMonth: '每月'
    },
    resetSecret: {
      button: '重置订阅密钥',
      confirm: '确定要重置订阅密钥吗？您当前的订阅链接将停止工作。',
      success: '订阅密钥重置成功',
      error: '重置订阅密钥失败',
      warning: '警告：这将使您当前的订阅链接失效'
    },
    serverNodes: {
      title: '可用服务器',
      description: '使用您的订阅链接连接到这些服务器',
      noServers: '无可用服务器',
      region: '地区',
      name: '服务器名称',
      status: '状态',
      online: '在线',
      offline: '离线',
      rate: '倍率'
    },
    clientConfig: {
      title: '客户端配置',
      description: '不同平台的设置指南',
      platforms: {
        ios: 'iOS',
        android: 'Android',
        windows: 'Windows',
        macos: 'macOS',
        linux: 'Linux'
      },
      steps: {
        download: '下载并安装客户端',
        import: '导入订阅链接',
        connect: '选择服务器并连接'
      },
      recommendedClients: '推荐客户端'
    }
  },
  traffic: {
    title: '流量使用',
    subtitle: '监控您的数据使用情况',
    loading: '加载流量数据中...',
    error: '加载流量数据失败',
    overview: {
      title: '当前使用',
      upload: '上传',
      download: '下载',
      total: '总计',
      remaining: '剩余',
      quota: '配额',
      percentage: '已使用'
    },
    stats: {
      title: '统计',
      today: '今天',
      yesterday: '昨天',
      thisMonth: '本月',
      lastMonth: '上月'
    },
    chart: {
      title: '流量历史',
      upload: '上传',
      download: '下载',
      total: '总计',
      date: '日期',
      noData: '无数据'
    },
    breakdown: {
      title: '服务器使用情况',
      server: '服务器',
      upload: '上传',
      download: '下载',
      total: '总计',
      percentage: '百分比',
      noData: '无数据'
    },
    filters: {
      title: '筛选',
      dateRange: '日期范围',
      startDate: '开始日期',
      endDate: '结束日期',
      server: '服务器',
      allServers: '所有服务器',
      apply: '应用',
      clear: '清除',
      last7Days: '最近7天',
      last30Days: '最近30天',
      thisMonth: '本月',
      lastMonth: '上月'
    },
    resetInfo: {
      title: '流量重置',
      nextReset: '下次重置',
      resetDay: '重置日',
      description: '您的流量配额将在以下日期重置'
    }
  },
  giftCards: {
    title: '礼品卡',
    subtitle: '兑换礼品卡以增加余额或流量',
    redeemTitle: '兑换礼品卡',
    codeLabel: '礼品卡代码',
    type: '类型',
    typeBalance: '余额',
    typeTraffic: '流量'
  },
  settings: {
    title: '账户设置',
    subtitle: '管理您的账户偏好和安全设置',
    profile: {
      title: '个人信息',
      description: '查看您的账户信息',
      email: '邮箱地址',
      emailPlaceholder: 'your@email.com',
      userId: '用户ID',
      memberSince: '注册时间'
    },
    password: {
      title: '修改密码',
      description: '更新您的密码以保护账户安全',
      current: '当前密码',
      currentPlaceholder: '请输入当前密码',
      new: '新密码',
      newPlaceholder: '请输入新密码',
      confirm: '确认新密码',
      confirmPlaceholder: '请再次输入新密码',
      submit: '修改密码',
      success: '密码修改成功',
      error: '密码修改失败',
      currentRequired: '当前密码不能为空',
      newRequired: '新密码不能为空',
      confirmRequired: '请确认密码',
      minLength: '密码至少需要8个字符',
      mismatch: '两次输入的密码不一致'
    },
    email: {
      title: '更新邮箱',
      description: '更改您的邮箱地址',
      current: '当前邮箱',
      new: '新邮箱地址',
      newPlaceholder: '请输入新邮箱',
      password: '密码',
      passwordPlaceholder: '请输入密码以确认',
      submit: '更新邮箱',
      success: '邮箱更新成功',
      error: '邮箱更新失败',
      newRequired: '新邮箱不能为空',
      invalid: '请输入有效的邮箱地址',
      passwordRequired: '更新邮箱需要输入密码'
    },
    notifications: {
      title: '通知偏好',
      description: '选择您想要接收的通知',
      orderUpdates: '订单更新',
      orderUpdatesDesc: '接收订单状态变更通知',
      trafficAlerts: '流量提醒',
      trafficAlertsDesc: '流量使用量较高时接收提醒',
      systemAnnouncements: '系统公告',
      systemAnnouncementsDesc: '重要更新和维护通知',
      promotions: '促销优惠',
      promotionsDesc: '特别优惠和促销信息',
      save: '保存偏好',
      success: '通知偏好已保存',
      error: '保存偏好失败'
    },
    sessions: {
      title: '活跃会话',
      description: '管理当前登录您账户的设备',
      empty: '无活跃会话',
      unknownDevice: '未知设备',
      current: '当前会话',
      lastActive: '最后活跃',
      revoke: '撤销',
      revokeAll: '撤销所有其他会话',
      revokeSuccess: '会话已成功撤销',
      revokeError: '撤销会话失败',
      revokeAllSuccess: '所有其他会话已撤销',
      revokeAllError: '撤销会话失败',
      fetchError: '加载会话失败'
    }
  },
  sharedPlans: {
    title: '共享套餐',
    subtitle: '浏览和购买共享订阅套餐',
    noPlans: '暂无共享套餐',
    nodes: '节点',
    traffic: '流量',
    duration: '有效期',
    days: '天',
    availability: '可用性',
    slotsAvailable: '个名额可用',
    full: '已满',
    soldOut: '已售罄',
    purchase: '购买',
    confirmPurchase: '确认购买',
    confirmPurchaseMessage: '您即将购买 "{name}"，价格 ¥{price}（{period}）。继续吗？',
    purchaseSuccess: '套餐购买成功！',
    purchaseFailed: '购买套餐失败',
    trafficShared: '流量由所有用户共享',
    serverGroup: '权限组',
    selectPeriod: '选择订阅周期',
    selectPeriodFirst: '请先选择订阅周期',
    invalidPeriod: '无效的订阅周期',
    recommended: '推荐',
    avgMonthly: '月均',
    permanent: '永久有效',
    mySubscriptions: {
      title: '我的共享订阅',
      subtitle: '管理您的共享订阅套餐',
      noSubscriptions: '暂无共享订阅',
      subscriptionUrl: '订阅地址',
      copy: '复制',
      copied: '已复制！',
      status: '状态',
      active: '活跃',
      expired: '已过期',
      expiresAt: '过期时间',
      traffic: '流量',
      shared: '共享',
      nodes: '节点',
      format: '格式',
      viewDetails: '查看详情'
    }
  }
}
