<template>
  <div class="system-config-page">
    <el-card class="page-header" shadow="never">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">{{ t('config.title') }}</h2>
          <p class="mt-1 text-sm text-gray-600">{{ t('config.description') }}</p>
        </div>
        <el-button
          type="primary"
          :loading="configStore.saving"
          :disabled="!hasChanges"
          @click="handleSave"
        >
          <el-icon class="mr-2"><Check /></el-icon>
          {{ t('common.save') }}
        </el-button>
      </div>
    </el-card>

    <el-card class="mt-4" shadow="never" v-loading="configStore.loading">
      <el-tabs v-model="activeTab" class="config-tabs">
        <!-- Site Settings -->
        <el-tab-pane :label="t('config.tabs.site')" name="site">
          <el-form :model="formData" label-width="180px" class="config-form">
            <el-form-item :label="t('config.site.name')">
              <el-input v-model="formData.site_name" :placeholder="t('config.site.namePlaceholder')" />
            </el-form-item>
            
            <el-form-item :label="t('config.site.url')">
              <el-input v-model="formData.site_url" :placeholder="t('config.site.urlPlaceholder')" />
            </el-form-item>
            
            <el-form-item :label="t('config.site.description')">
              <el-input
                v-model="formData.site_description"
                type="textarea"
                :rows="3"
                :placeholder="t('config.site.descriptionPlaceholder')"
              />
            </el-form-item>
            
            <el-form-item :label="t('config.site.logo')">
              <el-input v-model="formData.logo_url" :placeholder="t('config.site.logoPlaceholder')" />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- Email Settings -->
        <el-tab-pane :label="t('config.tabs.email')" name="email">
          <el-form :model="formData" label-width="180px" class="config-form">
            <el-form-item :label="t('config.email.host')">
              <el-input v-model="formData.email_host" :placeholder="t('config.email.hostPlaceholder')" />
            </el-form-item>
            
            <el-form-item :label="t('config.email.port')">
              <el-input-number v-model="formData.email_port" :min="1" :max="65535" />
            </el-form-item>
            
            <el-form-item :label="t('config.email.username')">
              <el-input v-model="formData.email_username" :placeholder="t('config.email.usernamePlaceholder')" />
            </el-form-item>
            
            <el-form-item :label="t('config.email.password')">
              <el-input
                v-model="formData.email_password"
                type="password"
                show-password
                :placeholder="t('config.email.passwordPlaceholder')"
              />
            </el-form-item>
            
            <el-form-item :label="t('config.email.encryption')">
              <el-select v-model="formData.email_encryption" :placeholder="t('config.email.encryptionPlaceholder')">
                <el-option label="None" :value="null" />
                <el-option label="TLS" value="tls" />
                <el-option label="SSL" value="ssl" />
              </el-select>
            </el-form-item>
            
            <el-form-item :label="t('config.email.fromAddress')">
              <el-input v-model="formData.email_from_address" :placeholder="t('config.email.fromAddressPlaceholder')" />
            </el-form-item>
            
            <el-form-item :label="t('config.email.fromName')">
              <el-input v-model="formData.email_from_name" :placeholder="t('config.email.fromNamePlaceholder')" />
            </el-form-item>
            
            <el-form-item>
              <el-button type="primary" :loading="configStore.testingEmail" @click="handleTestEmail">
                <el-icon class="mr-2"><Message /></el-icon>
                {{ t('config.email.testButton') }}
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- Telegram Settings -->
        <el-tab-pane :label="t('config.tabs.telegram')" name="telegram">
          <el-form :model="formData" label-width="180px" class="config-form">
            <el-form-item :label="t('config.telegram.botToken')">
              <el-input
                v-model="formData.telegram_bot_token"
                type="password"
                show-password
                :placeholder="t('config.telegram.botTokenPlaceholder')"
              />
            </el-form-item>
            
            <el-form-item :label="t('config.telegram.webhookUrl')">
              <el-input v-model="formData.telegram_webhook_url" :placeholder="t('config.telegram.webhookUrlPlaceholder')" />
            </el-form-item>
            
            <el-form-item :label="t('config.telegram.chatId')">
              <el-input v-model="formData.telegram_chat_id" :placeholder="t('config.telegram.chatIdPlaceholder')" />
            </el-form-item>
            
            <el-form-item :label="t('config.telegram.discussLink')">
              <el-input v-model="formData.telegram_discuss_link" :placeholder="t('config.telegram.discussLinkPlaceholder')" />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- Subscription Settings -->
        <el-tab-pane :label="t('config.tabs.subscription')" name="subscription">
          <el-form :model="formData" label-width="220px" class="config-form">
            <el-form-item :label="t('config.subscription.url')">
              <el-input v-model="formData.subscribe_url" :placeholder="t('config.subscription.urlPlaceholder')" />
            </el-form-item>
            
            <el-form-item :label="t('config.subscription.domain')">
              <el-input v-model="formData.subscribe_domain" :placeholder="t('config.subscription.domainPlaceholder')" />
            </el-form-item>
            
            <el-form-item :label="t('config.subscription.planChangeEnable')">
              <el-switch v-model="formData.plan_change_enable" />
            </el-form-item>
            
            <el-form-item :label="t('config.subscription.resetTrafficMethod')">
              <el-select v-model="formData.reset_traffic_method" :placeholder="t('config.subscription.resetTrafficMethodPlaceholder')">
                <el-option :label="t('config.subscription.resetMethods.monthly')" :value="0" />
                <el-option :label="t('config.subscription.resetMethods.firstDay')" :value="1" />
                <el-option :label="t('config.subscription.resetMethods.orderDay')" :value="2" />
                <el-option :label="t('config.subscription.resetMethods.noReset')" :value="3" />
              </el-select>
            </el-form-item>
            
            <el-form-item :label="t('config.subscription.surplusEnable')">
              <el-switch v-model="formData.surplus_enable" />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- Commission Settings -->
        <el-tab-pane :label="t('config.tabs.commission')" name="commission">
          <el-form :model="formData" label-width="280px" class="config-form">
            <el-form-item :label="t('config.commission.inviteForce')">
              <el-switch v-model="formData.invite_force" />
            </el-form-item>
            
            <el-form-item :label="t('config.commission.firstTimeEnable')">
              <el-switch v-model="formData.invite_commission_first_time_enable" />
            </el-form-item>
            
            <el-form-item :label="t('config.commission.firstTimeRate')">
              <el-input-number v-model="formData.invite_commission_first_time_rate" :min="0" :max="100" :step="1" />
              <span class="ml-2 text-gray-500">%</span>
            </el-form-item>
            
            <el-form-item :label="t('config.commission.cycleEnable')">
              <el-switch v-model="formData.invite_commission_cycle_enable" />
            </el-form-item>
            
            <el-form-item :label="t('config.commission.cycleRate')">
              <el-input-number v-model="formData.invite_commission_cycle_rate" :min="0" :max="100" :step="1" />
              <span class="ml-2 text-gray-500">%</span>
            </el-form-item>
            
            <el-form-item :label="t('config.commission.cycleLimit')">
              <el-input-number v-model="formData.invite_commission_cycle_limit" :min="0" />
            </el-form-item>
            
            <el-form-item :label="t('config.commission.genNum')">
              <el-input-number v-model="formData.invite_gen_num" :min="1" :max="100" />
            </el-form-item>
            
            <el-form-item :label="t('config.commission.neverExpire')">
              <el-switch v-model="formData.invite_never_expire" />
            </el-form-item>
            
            <el-form-item :label="t('config.commission.withdrawLimit')">
              <el-input-number v-model="formData.commission_withdraw_limit" :min="0" />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- Security Settings -->
        <el-tab-pane :label="t('config.tabs.security')" name="security">
          <el-form :model="formData" label-width="240px" class="config-form">
            <el-form-item :label="t('config.security.registerLimitByIp')">
              <el-switch v-model="formData.register_limit_by_ip_enable" />
            </el-form-item>
            
            <el-form-item :label="t('config.security.registerLimitCount')">
              <el-input-number v-model="formData.register_limit_count" :min="1" />
            </el-form-item>
            
            <el-form-item :label="t('config.security.registerLimitExpire')">
              <el-input-number v-model="formData.register_limit_expire" :min="1" />
              <span class="ml-2 text-gray-500">{{ t('config.security.hours') }}</span>
            </el-form-item>
            
            <el-form-item :label="t('config.security.emailVerify')">
              <el-switch v-model="formData.email_verify_enable" />
            </el-form-item>
            
            <el-form-item :label="t('config.security.emailGmailLimit')">
              <el-switch v-model="formData.email_gmail_limit_enable" />
            </el-form-item>
            
            <el-form-item :label="t('config.security.recaptchaEnable')">
              <el-switch v-model="formData.recaptcha_enable" />
            </el-form-item>
            
            <el-form-item :label="t('config.security.recaptchaKey')" v-if="formData.recaptcha_enable">
              <el-input
                v-model="formData.recaptcha_key"
                type="password"
                show-password
                :placeholder="t('config.security.recaptchaKeyPlaceholder')"
              />
            </el-form-item>
            
            <el-form-item :label="t('config.security.recaptchaSiteKey')" v-if="formData.recaptcha_enable">
              <el-input v-model="formData.recaptcha_site_key" :placeholder="t('config.security.recaptchaSiteKeyPlaceholder')" />
            </el-form-item>
            
            <el-form-item :label="t('config.security.passwordLimit')">
              <el-switch v-model="formData.password_limit_enable" />
            </el-form-item>
            
            <el-form-item :label="t('config.security.passwordLimitCount')">
              <el-input-number v-model="formData.password_limit_count" :min="1" />
            </el-form-item>
            
            <el-form-item :label="t('config.security.passwordLimitExpire')">
              <el-input-number v-model="formData.password_limit_expire" :min="1" />
              <span class="ml-2 text-gray-500">{{ t('config.security.hours') }}</span>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Check, Message } from '@element-plus/icons-vue';
import { useConfigStore } from '../../stores/config';
import type { SystemConfig } from '@xboard/shared/types/config';

const { t } = useI18n();
const configStore = useConfigStore();

// State
const activeTab = ref('site');
const formData = reactive<SystemConfig>({});
const originalData = ref<SystemConfig>({});

// Computed
const hasChanges = computed(() => {
  return JSON.stringify(formData) !== JSON.stringify(originalData.value);
});

// Methods
async function loadConfig() {
  await configStore.fetchConfig();
  Object.assign(formData, configStore.config);
  originalData.value = { ...configStore.config };
}

async function handleSave() {
  try {
    await ElMessageBox.confirm(
      t('config.saveConfirm'),
      t('common.confirm'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      }
    );
    
    await configStore.saveConfig(formData);
    originalData.value = { ...formData };
  } catch (error) {
    // User cancelled or error occurred
  }
}

async function handleTestEmail() {
  try {
    const { value: email } = await ElMessageBox.prompt(
      t('config.email.testPrompt'),
      t('config.email.testTitle'),
      {
        confirmButtonText: t('common.send'),
        cancelButtonText: t('common.cancel'),
        inputPattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        inputErrorMessage: t('config.email.invalidEmail'),
      }
    );
    
    if (email) {
      await configStore.testEmail({ email });
    }
  } catch (error) {
    // User cancelled or error occurred
  }
}

// Lifecycle
onMounted(() => {
  loadConfig();
});
</script>

<style scoped lang="scss">
.system-config-page {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.config-tabs {
  :deep(.el-tabs__content) {
    padding: 20px 0;
  }
}

.config-form {
  max-width: 800px;
  
  :deep(.el-form-item__label) {
    font-weight: 500;
  }
  
  :deep(.el-input),
  :deep(.el-select),
  :deep(.el-textarea) {
    width: 100%;
  }
  
  :deep(.el-input-number) {
    width: 200px;
  }
}
</style>
