<template>
  <div class="error-notification-container">
    <TransitionGroup name="notification">
      <div
        v-for="notification in notifications"
        :key="notification.id"
        :class="[
          'error-notification',
          `error-notification--${notification.type}`
        ]"
        role="alert"
        aria-live="assertive"
      >
        <div class="error-notification__content">
          <div class="error-notification__icon">
            <el-icon :size="20">
              <WarningFilled v-if="notification.type === 'auth' || notification.type === 'permission'" />
              <CircleCloseFilled v-else-if="notification.type === 'server' || notification.type === 'network'" />
              <InfoFilled v-else />
            </el-icon>
          </div>
          
          <div class="error-notification__body">
            <div class="error-notification__message">
              {{ notification.message }}
            </div>
            
            <!-- Validation errors -->
            <div v-if="notification.errors" class="error-notification__errors">
              <ul>
                <li v-for="(messages, field) in notification.errors" :key="field">
                  <strong>{{ field }}:</strong> {{ messages.join(', ') }}
                </li>
              </ul>
            </div>
          </div>

          <div class="error-notification__actions">
            <!-- Retry button for retryable errors -->
            <el-button
              v-if="notification.retryable && notification.retryFn"
              type="primary"
              size="small"
              @click="handleRetry(notification.id)"
            >
              {{ t('common.retry') }}
            </el-button>

            <!-- Close button -->
            <el-button
              type="text"
              size="small"
              @click="handleClose(notification.id)"
              :aria-label="t('common.close')"
            >
              <el-icon><Close /></el-icon>
            </el-button>
          </div>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { useErrorNotification } from '@xboard/shared/composables';
import { useI18n } from 'vue-i18n';
import { 
  WarningFilled, 
  CircleCloseFilled, 
  InfoFilled, 
  Close 
} from '@element-plus/icons-vue';

const { t } = useI18n();
const { notifications, hideError, retry } = useErrorNotification();

const handleClose = (id: string) => {
  hideError(id);
};

const handleRetry = async (id: string) => {
  await retry(id);
};
</script>

<style scoped lang="scss">
.error-notification-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  max-width: 400px;
  width: 100%;
  pointer-events: none;
}

.error-notification {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  margin-bottom: 12px;
  pointer-events: auto;
  border-left: 4px solid;
  
  &--network,
  &--server {
    border-left-color: var(--el-color-danger);
  }
  
  &--auth,
  &--permission {
    border-left-color: var(--el-color-warning);
  }
  
  &--validation {
    border-left-color: var(--el-color-info);
  }
  
  &--unknown {
    border-left-color: var(--el-color-error);
  }
}

.error-notification__content {
  display: flex;
  align-items: flex-start;
  padding: 16px;
  gap: 12px;
}

.error-notification__icon {
  flex-shrink: 0;
  color: var(--el-color-danger);
}

.error-notification__body {
  flex: 1;
  min-width: 0;
}

.error-notification__message {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  margin-bottom: 4px;
}

.error-notification__errors {
  margin-top: 8px;
  font-size: 12px;
  color: var(--el-text-color-regular);
  
  ul {
    margin: 0;
    padding-left: 20px;
  }
  
  li {
    margin-bottom: 4px;
  }
  
  strong {
    text-transform: capitalize;
  }
}

.error-notification__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

// Transition animations
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.notification-move {
  transition: transform 0.3s ease;
}
</style>
