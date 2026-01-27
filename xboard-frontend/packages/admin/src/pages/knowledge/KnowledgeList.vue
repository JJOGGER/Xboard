<template>
  <div class="knowledge-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <h2>知识库管理</h2>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            添加文章
          </el-button>
        </div>
      </template>

      <el-table :data="articles" v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="category" label="分类" width="120" />
        <el-table-column prop="title" label="标题" />
        <el-table-column prop="show" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.show ? 'success' : 'info'">
              {{ row.show ? '显示' : '隐藏' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'

const articles = ref([])
const loading = ref(false)

const fetchArticles = async () => {
  loading.value = true
  try {
    // TODO: 实现 API 调用
    ElMessage.info('知识库功能开发中')
  } catch (error) {
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

const handleAdd = () => {
  ElMessage.info('添加功能开发中')
}

const handleEdit = (row: any) => {
  ElMessage.info('编辑功能开发中')
}

const handleDelete = (row: any) => {
  ElMessage.info('删除功能开发中')
}

onMounted(() => {
  fetchArticles()
})
</script>

<style scoped>
.knowledge-list {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h2 {
  margin: 0;
  font-size: 18px;
}
</style>
