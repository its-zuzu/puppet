import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit2, Save, X, Tag, AlertCircle, CheckCircle } from 'lucide-react';
import axios from 'axios';
import './AdminCategories.css';

function AdminCategories() {
  const [categories, setCategories] = useState([
    { id: 'web', name: 'Web' },
    { id: 'crypto', name: 'Cryptography' },
    { id: 'forensics', name: 'Forensics' },
    { id: 'pwn', name: 'Binary' },
    { id: 'reverse', name: 'Reverse Engineering' },
    { id: 'misc', name: 'Miscellaneous' },
  ]);
  const [newCategory, setNewCategory] = useState({ id: '', name: '' });
  const [editingId, setEditingId] = useState(null);
  const [editingData, setEditingData] = useState({ id: '', name: '' });
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
    setTimeout(() => setAlert({ show: false, type: '', message: '' }), 3000);
  };

  const handleAddCategory = () => {
    if (!newCategory.id || !newCategory.name) {
      showAlert('error', 'Please fill in both ID and Name fields');
      return;
    }

    // Check for duplicate ID
    if (categories.find(cat => cat.id === newCategory.id)) {
      showAlert('error', 'Category ID already exists');
      return;
    }

    setCategories([...categories, { ...newCategory }]);
    setNewCategory({ id: '', name: '' });
    showAlert('success', 'Category added successfully');
  };

  const handleDeleteCategory = (id) => {
    if (window.confirm(`Are you sure you want to delete the "${categories.find(c => c.id === id)?.name}" category?`)) {
      setCategories(categories.filter(cat => cat.id !== id));
      showAlert('success', 'Category deleted successfully');
    }
  };

  const handleStartEdit = (category) => {
    setEditingId(category.id);
    setEditingData({ ...category });
  };

  const handleSaveEdit = () => {
    if (!editingData.name) {
      showAlert('error', 'Name cannot be empty');
      return;
    }

    setCategories(categories.map(cat => 
      cat.id === editingId ? { ...cat, name: editingData.name } : cat
    ));
    setEditingId(null);
    showAlert('success', 'Category updated successfully');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingData({ id: '', name: '' });
  };

  return (
    <div className="htb-admin-categories-container">
      <div className="htb-admin-categories-grid-bg" />

      <motion.div 
        className="htb-admin-categories-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="htb-header-content">
          <Tag className="htb-header-icon" size={48} />
          <h1>Challenge <span className="htb-highlight">Categories</span></h1>
          <p>Manage challenge categories for your CTF platform</p>
        </div>
      </motion.div>

      <AnimatePresence>
        {alert.show && (
          <motion.div 
            className={`htb-alert htb-alert-${alert.type}`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {alert.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <span>{alert.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        className="htb-admin-categories-main"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        {/* Add New Category */}
        <div className="htb-category-section">
          <div className="htb-section-header">
            <h2>Add New Category</h2>
            <div className="htb-title-line" />
          </div>

          <div className="htb-add-category-form">
            <div className="htb-form-row">
              <div className="htb-form-group">
                <label>Category ID</label>
                <input
                  type="text"
                  placeholder="e.g., web, crypto, forensics"
                  value={newCategory.id}
                  onChange={(e) => setNewCategory({ ...newCategory, id: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                  className="htb-input"
                />
                <span className="htb-input-hint">Lowercase, no spaces</span>
              </div>

              <div className="htb-form-group">
                <label>Category Name</label>
                <input
                  type="text"
                  placeholder="e.g., Web Exploitation"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  className="htb-input"
                />
              </div>

              <motion.button
                className="htb-btn-add"
                onClick={handleAddCategory}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Plus size={20} />
                <span>Add Category</span>
              </motion.button>
            </div>
          </div>
        </div>

        {/* Existing Categories */}
        <div className="htb-category-section">
          <div className="htb-section-header">
            <h2>Existing Categories ({categories.length})</h2>
            <div className="htb-title-line" />
          </div>

          <div className="htb-categories-grid">
            {categories.map((category, index) => (
              <motion.div
                key={category.id}
                className="htb-category-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                layout
              >
                {editingId === category.id ? (
                  <div className="htb-category-edit-mode">
                    <div className="htb-edit-field">
                      <label>ID (Read-only)</label>
                      <input
                        type="text"
                        value={editingData.id}
                        disabled
                        className="htb-input-disabled"
                      />
                    </div>
                    <div className="htb-edit-field">
                      <label>Name</label>
                      <input
                        type="text"
                        value={editingData.name}
                        onChange={(e) => setEditingData({ ...editingData, name: e.target.value })}
                        className="htb-input"
                      />
                    </div>
                    <div className="htb-edit-actions">
                      <motion.button
                        className="htb-btn-save"
                        onClick={handleSaveEdit}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Save size={16} />
                      </motion.button>
                      <motion.button
                        className="htb-btn-cancel"
                        onClick={handleCancelEdit}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <X size={16} />
                      </motion.button>
                    </div>
                  </div>
                ) : (
                  <div className="htb-category-view-mode">
                    <div className="htb-category-info">
                      <div className="htb-category-id">{category.id}</div>
                      <div className="htb-category-name">{category.name}</div>
                    </div>
                    <div className="htb-category-actions">
                      <motion.button
                        className="htb-btn-edit"
                        onClick={() => handleStartEdit(category)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        title="Edit category"
                      >
                        <Edit2 size={18} />
                      </motion.button>
                      <motion.button
                        className="htb-btn-delete"
                        onClick={() => handleDeleteCategory(category.id)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        title="Delete category"
                      >
                        <Trash2 size={18} />
                      </motion.button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Info Box */}
        <motion.div 
          className="htb-info-box"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <AlertCircle size={20} />
          <div>
            <strong>Note:</strong> Changes made here are stored locally in this session. 
            To persist categories across the platform, you need to update the Challenges.jsx component 
            or implement a backend API endpoint for category management.
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default AdminCategories;
