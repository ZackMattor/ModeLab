<template>
  <div class="track-list">
    <div class="header toolbar">
      <strong>Tracks</strong>
      <button class="small" title="Add track" @click="$emit('add')">＋</button>
    </div>
    <ul>
      <li
        v-for="t in tracks"
        :key="t.id"
        :class="{ active: t.id === selectedId }"
        @click="$emit('select', t.id)"
      >
        <span v-if="editId !== t.id" class="name-label" @dblclick.stop="startEdit(t)">{{
          t.name
        }}</span>
        <input
          v-else
          class="name-input"
          v-model="editName"
          @click.stop
          @keyup.enter="commitEdit(t)"
          @blur="commitEdit(t)"
        />
        <div class="row-actions">
          <button class="icon" title="Rename" @click.stop="startEdit(t)">✎</button>
          <button class="icon danger" title="Remove" @click.stop="$emit('remove', t.id)">✕</button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script>
  export default {
    name: 'TrackList',
    props: {
      tracks: { type: Array, required: true },
      selectedId: { type: [String, Number], required: true },
    },
    data() {
      return { editId: null, editName: '' };
    },
    methods: {
      startEdit(t) {
        this.editId = t.id;
        this.editName = t.name;
        this.$nextTick(() => {
          const el = this.$el.querySelector('input.name-input');
          if (el) el.focus();
        });
      },
      commitEdit(t) {
        if (this.editId !== t.id) return;
        const name = (this.editName || '').trim();
        if (name && name !== t.name) this.$emit('rename', { id: t.id, name });
        this.editId = null;
        this.editName = '';
      },
    },
  };
</script>

<style scoped>
  .track-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  li {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 6px;
    border: 1px solid #ddd;
    border-radius: 6px;
    cursor: pointer;
  }
  li.active {
    background: #f5f7ff;
    border-color: #c8d1ff;
  }
  span.name-label {
    flex: 1;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  input.name-input {
    flex: 1;
    border: 1px solid #cfd6ea;
    border-radius: 4px;
    padding: 3px 6px;
  }
  button.small {
    font-size: 12px;
    padding: 4px 8px;
  }
  button.icon {
    border: none;
    background: transparent;
    cursor: pointer;
  }
  button.danger {
    color: #b00020;
  }
  .row-actions {
    display: inline-flex;
    gap: 6px;
  }
</style>
