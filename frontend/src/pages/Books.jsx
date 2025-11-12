import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";

export default function Books() {
  const [books, setBooks] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [editingBook, setEditingBook] = useState(null);
  const [activeTab, setActiveTab] = useState('books'); // 'books' or 'orders'
  const [form, setForm] = useState({
    title: "",
    author: "",
    price: "",
    description: "",
    format: "soft", // 'soft' or 'hard'
    cover_image_url: "",
    file_url: "",
    chapter_count: "",
    page_count: "",
  });

  const formatPrice = (price) => {
    // Handle undefined, null, or NaN values
    const validPrice = price && !isNaN(price) ? Number(price) : 0;
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(validPrice);
  };

  // Fetch books and orders
  useEffect(() => {
    loadBooks();
    loadOrders();
  }, []);

  const loadBooks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get("/api/dashboard/books");
      setBooks(data);
    } catch (err) {
      console.error("Error loading books:", err);
      setError("Failed to load books");
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      const data = await api.get("/api/dashboard/books/orders");
      setOrders(data);
    } catch (err) {
      console.error("Error loading orders:", err);
      // Don't set error for orders as it's not critical
    }
  };

  // Handle input
  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === 'file') {
      // Store file object for upload
      if (files && files[0]) {
        setForm({ ...form, [name + '_file']: files[0] });
      }
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  // Remove uploaded file
  const handleRemoveFile = (fileType) => {
    if (fileType === 'bookFile') {
      setForm({ ...form, bookFile_file: null });
      // Clear the file input
      const fileInput = document.querySelector('input[name="bookFile"]');
      if (fileInput) fileInput.value = '';
    } else if (fileType === 'coverFile') {
      setForm({ ...form, coverFile_file: null });
      // Clear the file input
      const fileInput = document.querySelector('input[name="coverFile"]');
      if (fileInput) fileInput.value = '';
    }
  };

  // Add/Update book
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.author.trim() || !form.price || !form.description.trim()) {
      setError("Please fill in all required fields");
      return;
    }
    
    // Validate format-specific requirements (only for new books, not edits)
    if (!editingBook) {
      if (form.format === "hard" && !form.cover_image_url?.trim() && !form.coverFile_file) {
        setError("Cover image is required for hard copy books (upload file or provide URL)");
        return;
      }
      
      if (form.format === "soft" && !form.file_url?.trim() && !form.bookFile_file) {
        setError("Book file is required for soft copy books (upload file or provide URL)");
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      // Check if we have files to upload
      const hasFiles = form.bookFile_file || form.coverFile_file;
      
      if (hasFiles) {
        // Use FormData for file uploads
        const formData = new FormData();
        formData.append('title', form.title || '');
        formData.append('author', form.author || '');
        formData.append('price_cents', String(Math.round(parseFloat(form.price) * 100)));
        formData.append('description', form.description || '');
        formData.append('format', form.format || 'soft');
        if (form.cover_image_url) formData.append('cover_image_url', form.cover_image_url);
        if (form.file_url) formData.append('file_url', form.file_url);
        if (form.chapter_count) formData.append('chapter_count', String(form.chapter_count));
        if (form.page_count) formData.append('page_count', String(form.page_count));
        
        if (form.bookFile_file) {
          formData.append('bookFile', form.bookFile_file);
        }
        if (form.coverFile_file) {
          formData.append('coverFile', form.coverFile_file);
        }
        
        // Debug: Log FormData contents
        console.log("FormData contents:", {
          title: form.title,
          author: form.author,
          price_cents: Math.round(parseFloat(form.price) * 100),
          description: form.description,
          format: form.format || 'soft',
          hasBookFile: !!form.bookFile_file,
          hasCoverFile: !!form.coverFile_file
        });

        if (editingBook) {
          const updatedBook = await api.put(`/api/dashboard/books/${editingBook.id}`, formData, true);
          setBooks(books.map((book) => 
            book.id === editingBook.id ? updatedBook : book
          ));
          setEditingBook(null);
        } else {
          const response = await api.postFormData("/api/dashboard/books", formData);
          if (response) {
            setBooks([response, ...books]);
          }
        }
      } else {
        // Use JSON for regular data
        const bookData = {
          title: form.title,
          author: form.author,
          price_cents: Math.round(parseFloat(form.price) * 100),
          description: form.description,
          format: form.format || 'soft',
          cover_image_url: form.cover_image_url || (editingBook?.cover_image_url || null),
          file_url: form.format === 'soft' 
            ? (form.file_url || (editingBook?.file_url || null))
            : null,
          chapter_count: form.chapter_count ? parseInt(form.chapter_count, 10) : null,
          page_count: form.page_count ? parseInt(form.page_count, 10) : null,
        };

        if (editingBook) {
          const updatedBook = await api.put(`/api/dashboard/books/${editingBook.id}`, bookData);
          setBooks(books.map((book) => 
            book.id === editingBook.id ? updatedBook : book
          ));
          setEditingBook(null);
        } else {
          const response = await api.post("/api/dashboard/books", bookData);
          if (response) {
            setBooks([response, ...books]);
          }
        }
      }

      // Reload books to ensure consistency
      loadBooks();

      // Reset form
      setForm({
        title: "",
        author: "",
        price: "",
        description: "",
        format: "soft",
        cover_image_url: "",
        file_url: "",
        chapter_count: "",
        page_count: "",
        bookFile_file: null,
        coverFile_file: null,
      });
      // Clear file inputs
      const bookFileInput = document.querySelector('input[name="bookFile"]');
      const coverFileInput = document.querySelector('input[name="coverFile"]');
      if (bookFileInput) bookFileInput.value = '';
      if (coverFileInput) coverFileInput.value = '';
    } catch (err) {
      console.error("Error saving book:", err);
      const errorMessage = err.message || err.toString() || "Failed to save book";
      setError(errorMessage);
      // Show more detailed error if available
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      }
    } finally {
      setLoading(false);
    }
  };

  // Delete book
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this book?")) return;

    try {
      setLoading(true);
      await api.delete(`/api/dashboard/books/${id}`);
      setBooks(books.filter((book) => book.id !== id));
      setError(null);
      
      // Reload books to ensure consistency
      loadBooks();
    } catch (err) {
      console.error("Error deleting book:", err);
      setError("Failed to delete book");
    } finally {
      setLoading(false);
    }
  };

  // Edit book (populate form)
  const handleEdit = (book) => {
    setEditingBook(book);
    setForm({
      title: book.title,
      author: book.author,
      price: (book.price_cents / 100).toFixed(2),
      description: book.description || "",
      format: book.format || "soft",
      cover_image_url: book.cover_image_url || "",
      file_url: book.file_url || "",
      chapter_count: book.chapter_count || "",
      page_count: book.page_count || "",
      bookFile_file: null,
      coverFile_file: null,
    });
    // Clear file inputs
    const bookFileInput = document.querySelector('input[name="bookFile"]');
    const coverFileInput = document.querySelector('input[name="coverFile"]');
    if (bookFileInput) bookFileInput.value = '';
    if (coverFileInput) coverFileInput.value = '';
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingBook(null);
    setForm({
      title: "",
      author: "",
      price: "",
      description: "",
      format: "soft",
      cover_image_url: "",
      file_url: "",
      chapter_count: "",
      page_count: "",
      bookFile_file: null,
      coverFile_file: null,
    });
    // Clear file inputs
    const bookFileInput = document.querySelector('input[name="bookFile"]');
    const coverFileInput = document.querySelector('input[name="coverFile"]');
    if (bookFileInput) bookFileInput.value = '';
    if (coverFileInput) coverFileInput.value = '';
  };

  // Update order status
  const updateOrderStatus = async (orderId, newStatus, additionalData = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      await api.put(`/api/dashboard/books/orders/${orderId}/status`, {
        order_status: newStatus,
        ...additionalData
      });
      
      setSuccessMessage(`✅ Order status updated to ${newStatus}`);
      loadOrders(); // Reload orders
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error("Error updating order status:", err);
      setError("Failed to update order status");
    } finally {
      setLoading(false);
    }
  };

  // Delete delivered order
  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to delete this delivered order? This action cannot be undone.")) return;

    try {
      setLoading(true);
      setError(null);
      await api.delete(`/api/dashboard/books/orders/${orderId}`);
      setSuccessMessage("✅ Order deleted successfully");
      loadOrders(); // Reload orders
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error("Error deleting order:", err);
      setError(err.response?.data?.error || "Failed to delete order");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ordered': return 'var(--btn-warning)';
      case 'paid': return 'var(--btn-info)';
      case 'shipped': return 'var(--btn-primary)';
      case 'delivered': return 'var(--btn-success)';
      case 'cancelled': return 'var(--btn-danger)';
      default: return 'var(--text-secondary)';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ordered': return '📋';
      case 'paid': return '💰';
      case 'shipped': return '📦';
      case 'delivered': return '✅';
      case 'cancelled': return '❌';
      default: return '❓';
    }
  };

  const cardStyle = {
    backgroundColor: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: 'var(--shadow)',
    marginBottom: '1rem'
  };

  const inputStyle = {
    padding: '0.75rem',
    border: '1px solid var(--input-border)',
    borderRadius: '6px',
    backgroundColor: 'var(--input-bg)',
    color: 'var(--text-primary)',
    fontSize: '1rem',
    width: '100%',
    boxSizing: 'border-box'
  };

  const buttonStyle = {
    backgroundColor: 'var(--btn-primary)',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '500',
    transition: 'all 0.2s ease'
  };

  const deleteButtonStyle = {
    backgroundColor: 'var(--btn-danger)',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500',
    transition: 'all 0.2s ease'
  };

  if (loading && books.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-primary)' }}>
        <p>Loading books...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Back Button */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link 
          to="/" 
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            backgroundColor: "var(--btn-secondary)",
            color: "var(--text-primary)",
            textDecoration: "none",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            transition: "all 0.2s ease"
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = "var(--btn-secondary-hover)";
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = "var(--btn-secondary)";
          }}
        >
          <span>←</span>
          <span>Back to Dashboard</span>
        </Link>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ color: 'var(--text-primary)', fontSize: '28px', fontWeight: '700', margin: 0 }}>
          📚 Books & Orders
        </h1>
        <Link
          to="/store"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 20px",
            backgroundColor: "var(--btn-primary)",
            color: "white",
            textDecoration: "none",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            transition: "all 0.2s ease"
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = "var(--btn-primary-hover)";
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = "var(--btn-primary)";
          }}
        >
          <span>🛒</span>
          <span>View Store</span>
        </Link>
      </div>

      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '1.5rem',
        borderBottom: '2px solid var(--border-color)'
      }}>
        <button
          onClick={() => setActiveTab('books')}
          style={{
            padding: '10px 20px',
            border: 'none',
            backgroundColor: activeTab === 'books' ? 'var(--btn-primary)' : 'transparent',
            color: activeTab === 'books' ? 'white' : 'var(--text-primary)',
            borderRadius: '6px 6px 0 0',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '16px'
          }}
        >
          📚 Books ({books.length})
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          style={{
            padding: '10px 20px',
            border: 'none',
            backgroundColor: activeTab === 'orders' ? 'var(--btn-primary)' : 'transparent',
            color: activeTab === 'orders' ? 'white' : 'var(--text-primary)',
            borderRadius: '6px 6px 0 0',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '16px'
          }}
        >
          📦 Orders ({orders.length})
        </button>
      </div>

      {error && (
        <div style={{
          backgroundColor: "var(--alert-danger)",
          color: "var(--alert-danger-text)",
          padding: "12px",
          borderRadius: "6px",
          marginBottom: "1.5rem",
          border: "1px solid var(--border-color)"
        }}>
          {error}
        </div>
      )}

      {successMessage && (
        <div style={{
          backgroundColor: "var(--alert-success)",
          color: "var(--alert-success-text)",
          padding: "12px",
          borderRadius: "6px",
          marginBottom: "1.5rem",
          border: "1px solid var(--border-color)"
        }}>
          {successMessage}
        </div>
      )}

      {/* Books Tab Content */}
      {activeTab === 'books' && (
        <>
          {/* Add/Edit Book Form */}
          <div style={cardStyle}>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem', fontSize: '20px', fontWeight: '600' }}>
          {editingBook ? "Edit Book" : "Add New Book"}
        </h3>
        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
            <input
              type="text"
              name="title"
              placeholder="Book Title"
              value={form.title}
              onChange={handleChange}
              required
              disabled={loading}
              style={inputStyle}
            />
            <input
              type="text"
              name="author"
              placeholder="Author Name"
              value={form.author}
              onChange={handleChange}
              required
              disabled={loading}
              style={inputStyle}
            />
            <input
              type="number"
              step="0.01"
              name="price"
              placeholder="Price (KES)"
              value={form.price}
              onChange={handleChange}
              required
              disabled={loading}
              style={inputStyle}
            />
            <select
              name="format"
              value={form.format}
              onChange={handleChange}
              required
              disabled={loading}
              style={inputStyle}
            >
              <option value="soft">Soft Copy (Digital)</option>
              <option value="hard">Hard Copy (Physical)</option>
            </select>
          </div>
          
          <div style={{ marginBottom: "15px" }}>
            <textarea
              name="description"
              placeholder="Book Description (e.g., genre, condition, summary, etc.)"
              value={form.description}
              onChange={handleChange}
              required
              disabled={loading}
              rows="4"
              style={{
                ...inputStyle,
                resize: "vertical",
                minHeight: "100px"
              }}
            />
          </div>

          {/* Cover Image Upload */}
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", color: "var(--text-primary)", marginBottom: "6px", fontWeight: "500" }}>
              Cover Image {form.format === "hard" && <span style={{ color: "var(--alert-danger-text)" }}>*</span>}
            </label>
            <div style={{ display: "flex", gap: "10px", flexDirection: "column" }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input
                  type="file"
                  name="coverFile"
                  accept="image/*"
                  onChange={handleChange}
                  disabled={loading}
                  style={{ ...inputStyle, flex: 1 }}
                />
                {form.coverFile_file && (
                  <button
                    type="button"
                    onClick={() => handleRemoveFile('coverFile')}
                    style={{
                      background: "#dc3545",
                      color: "white",
                      border: "none",
                      borderRadius: "50%",
                      width: "28px",
                      height: "28px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "20px",
                      fontWeight: "bold",
                      padding: 0,
                      lineHeight: 1,
                      flexShrink: 0
                    }}
                    title="Remove file"
                  >
                    ×
                  </button>
                )}
              </div>
              {form.coverFile_file && (
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", padding: "4px 8px", background: "var(--card-bg)", borderRadius: "4px" }}>
                  Selected: {form.coverFile_file.name}
                </div>
              )}
              <div style={{ color: "var(--text-muted)", fontSize: "12px" }}>OR</div>
              <input
                type="url"
                name="cover_image_url"
                placeholder="https://example.com/cover.jpg (or paste URL)"
                value={form.cover_image_url || ""}
                onChange={handleChange}
                disabled={loading}
                style={inputStyle}
              />
            </div>
            <small style={{ color: "var(--text-muted)", fontSize: "12px", display: "block", marginTop: "4px" }}>
              {form.format === "hard" 
                ? (editingBook ? "Optional. Upload file or provide URL. Leave empty to keep existing." : "Required for hard copy books. Upload image file or provide URL.")
                : "Optional. Upload image file or provide URL."}
            </small>
          </div>

          {/* File Upload for Soft Copy */}
          {form.format === "soft" && (
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", color: "var(--text-primary)", marginBottom: "6px", fontWeight: "500" }}>
                Book File (PDF/EPUB) <span style={{ color: "var(--alert-danger-text)" }}>*</span>
              </label>
              <div style={{ display: "flex", gap: "10px", flexDirection: "column" }}>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input
                    type="file"
                    name="bookFile"
                    accept=".pdf,.epub,.mobi,.txt,.doc,.docx"
                    onChange={handleChange}
                    disabled={loading}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  {form.bookFile_file && (
                    <button
                      type="button"
                      onClick={() => handleRemoveFile('bookFile')}
                      style={{
                        background: "#dc3545",
                        color: "white",
                        border: "none",
                        borderRadius: "50%",
                        width: "28px",
                        height: "28px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "20px",
                        fontWeight: "bold",
                        padding: 0,
                        lineHeight: 1,
                        flexShrink: 0
                      }}
                      title="Remove file"
                    >
                      ×
                    </button>
                  )}
                </div>
                {form.bookFile_file && (
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)", padding: "4px 8px", background: "var(--card-bg)", borderRadius: "4px" }}>
                    Selected: {form.bookFile_file.name}
                  </div>
                )}
                <div style={{ color: "var(--text-muted)", fontSize: "12px" }}>OR</div>
                <input
                  type="url"
                  name="file_url"
                  placeholder="https://example.com/book.pdf (or paste URL)"
                  value={form.file_url || ""}
                  onChange={handleChange}
                  disabled={loading}
                  style={inputStyle}
                />
              </div>
              <small style={{ color: "var(--text-muted)", fontSize: "12px", display: "block", marginTop: "4px" }}>
                {editingBook 
                  ? "Optional. Upload file or provide URL. Leave empty to keep existing."
                  : "Required for soft copy books. Upload PDF/EPUB file or provide URL."}
              </small>
            </div>
          )}

          {/* Chapter and Page Count */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
            <div>
              <label style={{ display: "block", color: "var(--text-primary)", marginBottom: "6px", fontWeight: "500" }}>
                Number of Chapters
              </label>
              <input
                type="number"
                name="chapter_count"
                placeholder="e.g., 12"
                value={form.chapter_count}
                onChange={handleChange}
                disabled={loading}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: "block", color: "var(--text-primary)", marginBottom: "6px", fontWeight: "500" }}>
                Number of Pages
              </label>
              <input
                type="number"
                name="page_count"
                placeholder="e.g., 250"
                value={form.page_count}
                onChange={handleChange}
                disabled={loading}
                style={inputStyle}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button 
              type="submit" 
              disabled={loading}
              style={{
                ...buttonStyle,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? "not-allowed" : "pointer"
              }}
            >
              {loading ? "Saving..." : (editingBook ? "Update Book" : "Add Book")}
            </button>
            {editingBook && (
              <button 
                type="button"
                onClick={handleCancelEdit}
                disabled={loading}
                style={{
                  backgroundColor: "var(--btn-secondary)",
                  color: "var(--text-primary)",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "500"
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* List Books */}
      <div>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem', fontSize: '20px', fontWeight: '600' }}>
          Available Books ({books.length})
        </h3>
        {books.length === 0 ? (
          <div style={{
            backgroundColor: "var(--card-bg)",
            padding: "2rem",
            borderRadius: "12px",
            border: "1px solid var(--border-color)",
            textAlign: "center",
            boxShadow: "var(--shadow)"
          }}>
            <p style={{ color: "var(--text-muted)", fontStyle: "italic", margin: 0 }}>
              No books available.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {books.map((book) => (
              <div key={book.id} style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: "0 0 8px 0", fontWeight: "500", fontSize: "16px", color: "var(--text-primary)" }}>
                      {book.title}
                    </p>
                    <p style={{ margin: "0 0 8px 0", fontSize: "14px", color: "var(--text-secondary)" }}>
                      by <strong>{book.author || "Unknown Author"}</strong>
                    </p>
                    <p style={{ margin: "0 0 8px 0", fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                      {book.description && book.description.trim().length > 0 ? book.description : "No description available."}
                    </p>
                    <div style={{ margin: "0 0 8px 0", fontSize: "12px", color: "var(--text-muted)" }}>
                      {book.chapter_count && <span>📖 {book.chapter_count} chapters</span>}
                      {book.chapter_count && book.page_count && <span> • </span>}
                      {book.page_count && <span>📄 {book.page_count} pages</span>}
                      {(book.chapter_count || book.page_count) && " • "}
                      <span>
                        {book.format
                          ? book.format === "soft" ? "💾 Soft copy" : "📦 Hard copy"
                          : book.file_url ? "💾 Soft copy" : "📦 Hard copy"}
                      </span>
                    </div>
                    <p style={{ margin: "0", fontSize: "16px", fontWeight: "500", color: "var(--btn-success)" }}>
                      {formatPrice(book.price_cents / 100)}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      onClick={() => handleEdit(book)}
                      disabled={loading}
                      style={{
                        backgroundColor: "var(--btn-warning)",
                        color: "white",
                        border: "none",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "500"
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(book.id)}
                      disabled={loading}
                      style={deleteButtonStyle}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
        </>
      )}

      {/* Orders Tab Content */}
      {activeTab === 'orders' && (
        <>
          <div>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem', fontSize: '20px', fontWeight: '600' }}>
              Book Orders ({orders.length})
            </h3>
            {orders.length === 0 ? (
              <div style={{
                backgroundColor: "var(--card-bg)",
                padding: "2rem",
                borderRadius: "12px",
                border: "1px solid var(--border-color)",
                textAlign: "center",
                boxShadow: "var(--shadow)"
              }}>
                <p style={{ color: "var(--text-muted)", fontStyle: "italic", margin: 0 }}>
                  No orders yet.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {orders.map((order) => {
                  console.log("Order data:", order, "book_format:", order.book_format);
                  return (
                  <div key={order.id} style={cardStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                          <span style={{ fontSize: "20px" }}>{getStatusIcon(order.order_status)}</span>
                          <span style={{ 
                            fontSize: "16px", 
                            fontWeight: "500", 
                            color: "var(--text-primary)",
                            textTransform: "capitalize"
                          }}>
                            {order.order_status}
                          </span>
                        </div>
                        <p style={{ margin: "0 0 8px 0", fontWeight: "500", fontSize: "16px", color: "var(--text-primary)" }}>
                          📚 {order.book_title}
                        </p>
                        <p style={{ margin: "0 0 8px 0", fontSize: "14px", color: "var(--text-secondary)" }}>
                          by {order.book_author}
                        </p>
                        <p style={{ margin: "0 0 8px 0", fontSize: "14px", color: "var(--text-secondary)" }}>
                          👤 {order.client_name} ({order.client_email})
                        </p>
                        <p style={{ margin: "0 0 8px 0", fontSize: "14px", color: "var(--text-secondary)" }}>
                          📞 {order.client_phone}
                        </p>
                        <p style={{ margin: "0 0 8px 0", fontSize: "14px", color: "var(--text-secondary)" }}>
                          📍 {order.client_address}, {order.client_city}, {order.client_country}
                        </p>
                        <p style={{ margin: "0 0 8px 0", fontSize: "14px", color: "var(--text-secondary)" }}>
                          💳 {order.payment_method} {order.payment_reference ? `(${order.payment_reference})` : ''}
                        </p>
                        <p style={{ margin: "0", fontSize: "16px", fontWeight: "500", color: "var(--btn-success)" }}>
                          {formatPrice(order.total_amount_cents / 100)}
                        </p>
                        {order.tracking_number && (
                          <p style={{ margin: "8px 0 0 0", fontSize: "14px", color: "var(--text-secondary)" }}>
                            📦 Tracking: {order.tracking_number}
                          </p>
                        )}
                        {order.estimated_delivery_date && (
                          <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "var(--text-secondary)" }}>
                            📅 Est. Delivery: {new Date(order.estimated_delivery_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {order.order_status === 'ordered' && (
                          <>
                            <button
                              onClick={() => updateOrderStatus(order.id, 'paid')}
                              disabled={loading}
                              style={{
                                backgroundColor: "var(--btn-info)",
                                color: "white",
                                border: "none",
                                padding: "6px 12px",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontSize: "12px",
                                fontWeight: "500"
                              }}
                            >
                              Mark Paid
                            </button>
                            <button
                              onClick={() => updateOrderStatus(order.id, 'cancelled')}
                              disabled={loading}
                              style={{
                                backgroundColor: "var(--btn-danger)",
                                color: "white",
                                border: "none",
                                padding: "6px 12px",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontSize: "12px",
                                fontWeight: "500"
                              }}
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {order.order_status === 'paid' && (
                          <>
                            {order.book_format === 'hard' && (
                              <button
                                onClick={() => {
                                  const trackingNumber = prompt("Enter tracking number:");
                                  const shippingCompany = prompt("Enter shipping company:");
                                  const estimatedDelivery = prompt("Enter estimated delivery date (YYYY-MM-DD):");
                                  updateOrderStatus(order.id, 'shipped', {
                                    tracking_number: trackingNumber,
                                    shipping_company: shippingCompany,
                                    estimated_delivery_date: estimatedDelivery
                                  });
                                }}
                                disabled={loading}
                                style={{
                                  backgroundColor: "var(--btn-primary)",
                                  color: "white",
                                  border: "none",
                                  padding: "6px 12px",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  fontSize: "12px",
                                  fontWeight: "500",
                                  marginBottom: "8px"
                                }}
                              >
                                Ship Order
                              </button>
                            )}
                            {order.book_format === 'soft' && (
                              <button
                                onClick={() => handleDeleteOrder(order.id)}
                                disabled={loading}
                                style={{
                                  backgroundColor: "var(--btn-danger)",
                                  color: "white",
                                  border: "none",
                                  padding: "6px 12px",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  fontSize: "12px",
                                  fontWeight: "500"
                                }}
                              >
                                Delete
                              </button>
                            )}
                          </>
                        )}
                        {order.order_status === 'shipped' && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'delivered')}
                            disabled={loading}
                            style={{
                              backgroundColor: "var(--btn-success)",
                              color: "white",
                              border: "none",
                              padding: "6px 12px",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontSize: "12px",
                              fontWeight: "500"
                            }}
                          >
                            Mark Delivered
                          </button>
                        )}
                        {order.order_status === 'delivered' && (
                          <button
                            onClick={() => handleDeleteOrder(order.id)}
                            disabled={loading}
                            style={{
                              backgroundColor: "var(--btn-danger)",
                              color: "white",
                              border: "none",
                              padding: "6px 12px",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontSize: "12px",
                              fontWeight: "500"
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
