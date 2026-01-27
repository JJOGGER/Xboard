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
            <n-icon :size="20">
              <svg v-if="notification.type === 'auth' || notification.type === 'permission'" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12 2L1 21h22M12 6l7.53 13H4.47M11 10v4h2v-4m-2 6v2h2v-2"/>
              </svg>
              <svg v-else-if="notification.type === 'server' || notification.type === 'network'" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>
              </svg>
              <svg v-else viewBox="0 0 24 24">
                <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
            </n-icon>
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
            <n-button
              v-if="notification.retryable && notification.retryFn"
              type="primary"
              size="small"
              @click="handleRetry(notification.id)"
            >
              {{ t('common.retry') }}
            </n-button>

            <!-- Close button -->
            <n-button
              text
              size="small"
              @click="handleClose(notification.id)"
              :aria-label="t('common.close')"
            >
              <template #icon>
                <n-icon>
                  <svg viewBox="0 0 24 24">
                    <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </n-icon>
              </template>
            </n-button>
          </div>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { useErrorNotification } from '@xboard/shared/composables';
import { useI18n } from 'vue-i18n';
import { NIcon, NButton } from 'naive-ui';

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
    border-left-color: #d03050;
  }
  
  &--auth,
  &--permission {
    border-left-color: #f0a020;
  }
  
  &--validation {
    border-left-color: #2080f0;
  }
  
  &--unknown {
    border-left-color: #d03050;
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
  color: #d03050;
}

.error-notification__body {
  flex: 1;
  min-width: 0;
}

.error-notification__message {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.error-notification__errors {
  margin-top: 8px;
  font-size: 12px;
  color: #666;
  
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

// Dark mode support
@media (prefers-color-scheme: dark) {
  .error-notification {
    background: #18181c;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
  
  .error-notification__message {
    color: #fff;
  }
  
  .error-notification__errors {
    color: #ccc;
  }
}
</style>
