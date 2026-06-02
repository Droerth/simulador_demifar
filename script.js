// ============ DATOS INICIALES ============
const DEFAULT_USERS = [
  { id: 1, usuario: 'admin', password: '123', rol: 'administrador', nombre: 'Administrador General', estado: 'Activo' },
  { id: 2, usuario: 'mauricio', password: '123', rol: 'empleado', nombre: 'Mauricio', estado: 'Activo' }
];

const DEFAULT_PRODUCTS = [
  { id: 1, nombre: "Paracetamol 500mg", precio: 5.50, categoria: "medicamentos", stock: 150, vencimiento: "2025-12-01", badge: "Esencial" },
  { id: 2, nombre: "Ibuprofeno 400mg", precio: 8.00, categoria: "medicamentos", stock: 8, vencimiento: "2024-10-15", badge: "Stock Bajo" },
  { id: 3, nombre: "Vitamina C 1000mg", precio: 15.00, categoria: "suplementos", stock: 45, vencimiento: "2026-05-20", badge: "Popular" },
  { id: 4, nombre: "Alcohol en Gel 500ml", precio: 12.00, categoria: "higiene", stock: 60, vencimiento: "2025-08-10", badge: "Oferta" },
  { id: 5, nombre: "Jarabe para la tos", precio: 22.50, categoria: "medicamentos", stock: 30, vencimiento: "2025-01-30", badge: "Nuevo" },
  { id: 6, nombre: "Mascarillas KN95 x10", precio: 10.00, categoria: "higiene", stock: 200, vencimiento: "2027-01-01", badge: "Proteccion" },
  { id: 7, nombre: "Suero Oral", precio: 6.00, categoria: "medicamentos", stock: 5, vencimiento: "2024-09-01", badge: "Critico" },
  { id: 8, nombre: "Termometro Digital", precio: 35.00, categoria: "higiene", stock: 15, vencimiento: "2030-01-01", badge: "Duradero" }
];

// ============ ESTADO GLOBAL ============
let currentUser = null;
let carrito = [];
let ventasHoy = 0;

// Cargar datos desde localStorage o usar valores por defecto
function loadData() {
  if (!localStorage.getItem('demifar_users')) {
    localStorage.setItem('demifar_users', JSON.stringify(DEFAULT_USERS));
  }
  if (!localStorage.getItem('demifar_products')) {
    localStorage.setItem('demifar_products', JSON.stringify(DEFAULT_PRODUCTS));
  }
  if (!localStorage.getItem('demifar_ventas')) {
    localStorage.setItem('demifar_ventas', '0');
  }
}

function getUsers() { return JSON.parse(localStorage.getItem('demifar_users')); }
function getProducts() { return JSON.parse(localStorage.getItem('demifar_products')); }
function saveUsers(users) { localStorage.setItem('demifar_users', JSON.stringify(users)); }
function saveProducts(products) { localStorage.setItem('demifar_products', JSON.stringify(products)); }
function saveVentas(total) { localStorage.setItem('demifar_ventas', total.toString()); }

// ============ ELEMENTOS DEL DOM ============
const loginView = document.getElementById('loginView');
const appView = document.getElementById('appView');
const loginForm = document.getElementById('loginForm');
const productsGrid = document.getElementById('productsGrid');
const cartDrawer = document.getElementById('cartDrawer');
const floatingCartBtn = document.getElementById('floatingCartBtn');
const closeCartBtn = document.querySelector('.close-cart');
const cartItemsContainer = document.getElementById('cartItems');
const cartTotalEl = document.getElementById('cartTotal');
const cartCountEl = document.getElementById('cartCount');
const toast = document.getElementById('toast');
const modal = document.getElementById('modal');

// ============ INICIALIZACIÓN ============
loadData();

// Verificar sesión activa al cargar la página
(function checkSession() {
  const sessionData = sessionStorage.getItem('demifar_session');
  if (sessionData) {
    const session = JSON.parse(sessionData);
    const users = getUsers();
    const user = users.find(u => u.id === session.id);
    if (user) {
      currentUser = user;
      showApp();
    }
  }
})();

// ============ AUTENTICACIÓN ============
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const user = document.getElementById('username').value.trim().toLowerCase();
  const pass = document.getElementById('password').value;
  
  const users = getUsers();
  const foundUser = users.find(u => u.usuario === user && u.password === pass);
  
  if (foundUser) {
    if (foundUser.estado !== 'Activo') {
      showToast('Esta cuenta esta deshabilitada');
      return;
    }
    currentUser = foundUser;
    sessionStorage.setItem('demifar_session', JSON.stringify(foundUser));
    loginForm.reset();
    showApp();
    showToast(`Bienvenido, ${currentUser.nombre}`);
  } else {
    showToast('Usuario o contrasena incorrectos');
  }
});

function showApp() {
  loginView.classList.add('hidden');
  appView.classList.remove('hidden');
  
  document.getElementById('userNameDisplay').textContent = currentUser.nombre;
  const roleBadge = document.getElementById('userRoleDisplay');
  roleBadge.textContent = currentUser.rol;
  roleBadge.className = `role-badge ${currentUser.rol}`;
  
  // Control de acceso por roles
  const isAdmin = currentUser.rol === 'administrador';
  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = isAdmin ? '' : 'none';
  });
  
  renderProducts('all');
  renderProductosTable();
  renderInventarioTable();
  renderUsuariosTable();
  updateStats();
}

document.getElementById('logoutBtn').addEventListener('click', () => {
  currentUser = null;
  carrito = [];
  sessionStorage.removeItem('demifar_session');
  updateCartUI();
  appView.classList.add('hidden');
  loginView.classList.remove('hidden');
  loginForm.reset();
  // Volver a la vista de ventas
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('[data-view="ventas"]').classList.add('active');
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  document.getElementById('view-ventas').classList.remove('hidden');
});

// ============ NAVEGACIÓN ============
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById(`view-${btn.dataset.view}`).classList.remove('hidden');
  });
});

// ============ MODAL GENÉRICO ============
function openModal(title, bodyHTML, footerHTML) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHTML;
  document.getElementById('modalFooter').innerHTML = footerHTML;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}

function closeModal() {
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}

document.getElementById('modalClose').addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});

// ============ PUNTO DE VENTA ============
function renderProducts(filter = 'all') {
  productsGrid.innerHTML = '';
  const productos = getProducts();
  const filtered = filter === 'all' ? productos : productos.filter(p => p.categoria === filter);
  
  if (filtered.length === 0) {
    productsGrid.innerHTML = '<p style="color:var(--muted); font-weight:700;">No hay productos en esta categoria.</p>';
    return;
  }
  
  filtered.forEach(p => {
    const card = document.createElement('article');
    card.className = 'item';
    card.innerHTML = `
      <div class="product-image-wrap">
        <span class="product-badge">${p.badge}</span>
        <span class="product-initial">${p.nombre.charAt(0)}</span>
      </div>
      <div class="card-body">
        <div class="card-top">
          <h3>${p.nombre}</h3>
          <p class="price">Bs. ${p.precio.toFixed(2)}</p>
        </div>
        <p class="description">Categoria: ${p.categoria}. Stock: ${p.stock} u.</p>
        <button class="add-button" data-id="${p.id}" ${p.stock <= 0 ? 'disabled' : ''}>
          ${p.stock <= 0 ? 'Sin Stock' : 'Agregar a la Venta'}
        </button>
      </div>
    `;
    productsGrid.appendChild(card);
  });
  
  // Agregar eventos a los botones
  document.querySelectorAll('.add-button[data-id]').forEach(btn => {
    btn.addEventListener('click', () => addToCart(Number(btn.dataset.id), btn));
  });
}

document.querySelectorAll('.filter').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderProducts(btn.dataset.filter);
  });
});

// ============ CARRITO ============
function addToCart(productId, btn) {
  const productos = getProducts();
  const product = productos.find(p => p.id === productId);
  if (!product || product.stock <= 0) {
    showToast('Sin stock disponible');
    return;
  }
  
  const existing = carrito.find(item => item.id === productId);
  if (existing) {
    if (existing.qty < product.stock) {
      existing.qty++;
    } else {
      showToast('Stock maximo alcanzado');
      return;
    }
  } else {
    carrito.push({ ...product, qty: 1 });
  }
  
  updateCartUI();
  showToast(`${product.nombre} agregado`);
  
  const originalText = btn.textContent;
  btn.textContent = 'Agregado';
  btn.style.background = 'var(--success)';
  setTimeout(() => {
    btn.textContent = originalText;
    btn.style.background = '';
  }, 800);
}

function updateCartUI() {
  const totalQty = carrito.reduce((sum, item) => sum + item.qty, 0);
  const totalPrice = carrito.reduce((sum, item) => sum + (item.precio * item.qty), 0);
  
  cartCountEl.textContent = totalQty;
  cartTotalEl.textContent = `Bs. ${totalPrice.toFixed(2)}`;
  
  if (carrito.length === 0) {
    cartItemsContainer.innerHTML = '<p class="empty-cart">No hay productos en la venta.</p>';
    return;
  }
  
  cartItemsContainer.innerHTML = carrito.map(item => `
    <div class="cart-item">
      <div style="display:flex; justify-content:space-between; font-weight:800;">
        <span>${item.nombre}</span>
        <span>Bs. ${(item.precio * item.qty).toFixed(2)}</span>
      </div>
      <div style="display:flex; justify-content:space-between; margin-top:0.5rem; font-size:0.9rem; color:var(--muted);">
        <span>Cantidad: ${item.qty}</span>
        <button onclick="removeFromCart(${item.id})" style="background:none; border:none; color:var(--danger); font-weight:900; cursor:pointer; padding:0;">Eliminar</button>
      </div>
    </div>
  `).join('');
}

window.removeFromCart = function(productId) {
  carrito = carrito.filter(item => item.id !== productId);
  updateCartUI();
};

document.getElementById('checkoutBtn').addEventListener('click', () => {
  if (carrito.length === 0) {
    showToast('El carrito esta vacio');
    return;
  }
  
  // Descontar stock
  const productos = getProducts();
  carrito.forEach(item => {
    const prod = productos.find(p => p.id === item.id);
    if (prod) prod.stock -= item.qty;
  });
  saveProducts(productos);
  
  // Registrar venta
  const total = carrito.reduce((sum, item) => sum + (item.precio * item.qty), 0);
  ventasHoy += total;
  saveVentas(ventasHoy);
  
  showToast('Venta registrada exitosamente');
  carrito = [];
  updateCartUI();
  cartDrawer.classList.remove('open');
  
  // Actualizar vistas
  renderProducts('all');
  renderProductosTable();
  renderInventarioTable();
  updateStats();
});

// ============ CRUD: PRODUCTOS ============
document.getElementById('btnNewProduct').addEventListener('click', () => {
  openProductModal();
});

function openProductModal(product = null) {
  const isEdit = product !== null;
  const title = isEdit ? 'Editar Producto' : 'Nuevo Producto';
  
  const body = `
    <div class="form-group">
      <label>Nombre</label>
      <input type="text" id="prodNombre" value="${isEdit ? product.nombre : ''}" required>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Categoria</label>
        <select id="prodCategoria">
          <option value="medicamentos" ${isEdit && product.categoria === 'medicamentos' ? 'selected' : ''}>Medicamentos</option>
          <option value="higiene" ${isEdit && product.categoria === 'higiene' ? 'selected' : ''}>Higiene</option>
          <option value="suplementos" ${isEdit && product.categoria === 'suplementos' ? 'selected' : ''}>Suplementos</option>
        </select>
      </div>
      <div class="form-group">
        <label>Badge</label>
        <input type="text" id="prodBadge" value="${isEdit ? product.badge : 'Nuevo'}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Precio (Bs.)</label>
        <input type="number" id="prodPrecio" step="0.01" min="0" value="${isEdit ? product.precio : ''}" required>
      </div>
      <div class="form-group">
        <label>Stock</label>
        <input type="number" id="prodStock" min="0" value="${isEdit ? product.stock : ''}" required>
      </div>
    </div>
    <div class="form-group">
      <label>Fecha de Vencimiento</label>
      <input type="date" id="prodVencimiento" value="${isEdit ? product.vencimiento : ''}" required>
    </div>
  `;
  
  const footer = `
    <button class="btn-cancel" onclick="closeModal()">Cancelar</button>
    <button class="btn-save" onclick="saveProduct(${isEdit ? product.id : 'null'})">${isEdit ? 'Guardar Cambios' : 'Crear Producto'}</button>
  `;
  
  openModal(title, body, footer);
}

window.saveProduct = function(id) {
  const nombre = document.getElementById('prodNombre').value.trim();
  const categoria = document.getElementById('prodCategoria').value;
  const badge = document.getElementById('prodBadge').value.trim() || 'General';
  const precio = parseFloat(document.getElementById('prodPrecio').value);
  const stock = parseInt(document.getElementById('prodStock').value);
  const vencimiento = document.getElementById('prodVencimiento').value;
  
  if (!nombre || isNaN(precio) || isNaN(stock) || !vencimiento) {
    showToast('Complete todos los campos');
    return;
  }
  
  const productos = getProducts();
  
  if (id === null) {
    // Crear
    const newId = productos.length > 0 ? Math.max(...productos.map(p => p.id)) + 1 : 1;
    productos.push({ id: newId, nombre, categoria, badge, precio, stock, vencimiento });
    showToast('Producto creado exitosamente');
  } else {
    // Editar
    const idx = productos.findIndex(p => p.id === id);
    if (idx !== -1) {
      productos[idx] = { ...productos[idx], nombre, categoria, badge, precio, stock, vencimiento };
      showToast('Producto actualizado');
    }
  }
  
  saveProducts(productos);
  closeModal();
  renderProducts('all');
  renderProductosTable();
  renderInventarioTable();
  updateStats();
};

window.deleteProduct = function(id) {
  openModal('Confirmar Eliminacion', 
    '<p style="font-weight:700;">Esta seguro de eliminar este producto? Esta accion no se puede deshacer.</p>',
    `<button class="btn-cancel" onclick="closeModal()">Cancelar</button>
     <button class="btn-confirm" onclick="confirmDeleteProduct(${id})">Eliminar</button>`
  );
};

window.confirmDeleteProduct = function(id) {
  const productos = getProducts().filter(p => p.id !== id);
  saveProducts(productos);
  closeModal();
  showToast('Producto eliminado');
  renderProducts('all');
  renderProductosTable();
  renderInventarioTable();
  updateStats();
};

function renderProductosTable() {
  const tbody = document.getElementById('productosTableBody');
  const productos = getProducts();
  const isAdmin = currentUser && currentUser.rol === 'administrador';
  
  if (productos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--muted);">No hay productos registrados</td></tr>';
    return;
  }
  
  tbody.innerHTML = productos.map(p => `
    <tr>
      <td>#${p.id}</td>
      <td><strong>${p.nombre}</strong></td>
      <td>${p.categoria}</td>
      <td>Bs. ${p.precio.toFixed(2)}</td>
      <td>${p.stock}</td>
      ${isAdmin ? `<td>
        <button class="action-btn edit" onclick="editProduct(${p.id})">Editar</button>
        <button class="action-btn delete" onclick="deleteProduct(${p.id})">Eliminar</button>
      </td>` : ''}
    </tr>
  `).join('');
}

window.editProduct = function(id) {
  const productos = getProducts();
  const product = productos.find(p => p.id === id);
  if (product) openProductModal(product);
};

// ============ CRUD: INVENTARIO ============
window.editInventario = function(id) {
  const productos = getProducts();
  const product = productos.find(p => p.id === id);
  if (!product) return;
  
  const body = `
    <div class="form-group">
      <label>Producto</label>
      <input type="text" value="${product.nombre}" disabled>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Stock Actual</label>
        <input type="number" id="invStock" min="0" value="${product.stock}">
      </div>
      <div class="form-group">
        <label>Fecha Vencimiento</label>
        <input type="date" id="invVencimiento" value="${product.vencimiento}">
      </div>
    </div>
  `;
  
  openModal('Actualizar Inventario', body, 
    `<button class="btn-cancel" onclick="closeModal()">Cancelar</button>
     <button class="btn-save" onclick="saveInventario(${id})">Guardar</button>`
  );
};

window.saveInventario = function(id) {
  const stock = parseInt(document.getElementById('invStock').value);
  const vencimiento = document.getElementById('invVencimiento').value;
  
  if (isNaN(stock) || !vencimiento) {
    showToast('Complete todos los campos');
    return;
  }
  
  const productos = getProducts();
  const idx = productos.findIndex(p => p.id === id);
  if (idx !== -1) {
    productos[idx].stock = stock;
    productos[idx].vencimiento = vencimiento;
    saveProducts(productos);
    closeModal();
    showToast('Inventario actualizado');
    renderProductosTable();
    renderInventarioTable();
    updateStats();
  }
};

function renderInventarioTable() {
  const tbody = document.getElementById('inventarioTableBody');
  const productos = getProducts();
  const isAdmin = currentUser && currentUser.rol === 'administrador';
  
  if (productos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--muted);">No hay productos registrados</td></tr>';
    return;
  }
  
  tbody.innerHTML = productos.map(p => {
    let estado = '<span class="status-badge ok">Normal</span>';
    if (p.stock < 10) estado = '<span class="status-badge critico">Critico</span>';
    
    return `
      <tr>
        <td><strong>${p.nombre}</strong></td>
        <td>${p.stock} unidades</td>
        <td>${estado}</td>
        <td>${p.vencimiento}</td>
        ${isAdmin ? `<td><button class="action-btn edit" onclick="editInventario(${p.id})">Actualizar</button></td>` : ''}
      </tr>
    `;
  }).join('');
}

// ============ CRUD: USUARIOS ============
document.getElementById('btnNewUser').addEventListener('click', () => {
  openUserModal();
});

function openUserModal(user = null) {
  const isEdit = user !== null;
  const title = isEdit ? 'Editar Usuario' : 'Nuevo Usuario';
  
  const body = `
    <div class="form-group">
      <label>Nombre Completo</label>
      <input type="text" id="userNombre" value="${isEdit ? user.nombre : ''}" required>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Usuario</label>
        <input type="text" id="userUsuario" value="${isEdit ? user.usuario : ''}" required>
      </div>
      <div class="form-group">
        <label>Contrasena ${isEdit ? '(dejar vacio para no cambiar)' : ''}</label>
        <input type="password" id="userPassword" ${isEdit ? '' : 'required'}>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Rol</label>
        <select id="userRol">
          <option value="administrador" ${isEdit && user.rol === 'administrador' ? 'selected' : ''}>Administrador</option>
          <option value="empleado" ${isEdit && user.rol === 'empleado' ? 'selected' : ''}>Empleado</option>
        </select>
      </div>
      <div class="form-group">
        <label>Estado</label>
        <select id="userEstado">
          <option value="Activo" ${isEdit && user.estado === 'Activo' ? 'selected' : ''}>Activo</option>
          <option value="Inactivo" ${isEdit && user.estado === 'Inactivo' ? 'selected' : ''}>Inactivo</option>
        </select>
      </div>
    </div>
  `;
  
  const footer = `
    <button class="btn-cancel" onclick="closeModal()">Cancelar</button>
    <button class="btn-save" onclick="saveUser(${isEdit ? user.id : 'null'})">${isEdit ? 'Guardar Cambios' : 'Crear Usuario'}</button>
  `;
  
  openModal(title, body, footer);
}

window.saveUser = function(id) {
  const nombre = document.getElementById('userNombre').value.trim();
  const usuario = document.getElementById('userUsuario').value.trim().toLowerCase();
  const password = document.getElementById('userPassword').value;
  const rol = document.getElementById('userRol').value;
  const estado = document.getElementById('userEstado').value;
  
  if (!nombre || !usuario) {
    showToast('Complete todos los campos');
    return;
  }
  
  const users = getUsers();
  
  // Validar usuario unico
  const duplicate = users.find(u => u.usuario === usuario && u.id !== id);
  if (duplicate) {
    showToast('Ese nombre de usuario ya existe');
    return;
  }
  
  if (id === null) {
    // Crear
    if (!password) {
      showToast('La contrasena es obligatoria');
      return;
    }
    const newId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
    users.push({ id: newId, usuario, password, rol, nombre, estado });
    showToast('Usuario creado exitosamente');
  } else {
    // Editar
    const idx = users.findIndex(u => u.id === id);
    if (idx !== -1) {
      users[idx] = { 
        ...users[idx], 
        nombre, 
        usuario, 
        rol, 
        estado,
        password: password || users[idx].password
      };
      showToast('Usuario actualizado');
      
      // Si se edito el usuario actual, actualizar sesion
      if (currentUser && currentUser.id === id) {
        currentUser = users[idx];
        sessionStorage.setItem('demifar_session', JSON.stringify(currentUser));
        document.getElementById('userNameDisplay').textContent = currentUser.nombre;
      }
    }
  }
  
  saveUsers(users);
  closeModal();
  renderUsuariosTable();
};

window.editUser = function(id) {
  const users = getUsers();
  const user = users.find(u => u.id === id);
  if (user) openUserModal(user);
};

window.deleteUser = function(id) {
  if (currentUser && currentUser.id === id) {
    showToast('No puede eliminar su propia cuenta');
    return;
  }
  
  openModal('Confirmar Eliminacion',
    '<p style="font-weight:700;">Esta seguro de eliminar este usuario? Esta accion no se puede deshacer.</p>',
    `<button class="btn-cancel" onclick="closeModal()">Cancelar</button>
     <button class="btn-confirm" onclick="confirmDeleteUser(${id})">Eliminar</button>`
  );
};

window.confirmDeleteUser = function(id) {
  const users = getUsers().filter(u => u.id !== id);
  saveUsers(users);
  closeModal();
  showToast('Usuario eliminado');
  renderUsuariosTable();
};

function renderUsuariosTable() {
  const tbody = document.getElementById('usuariosTableBody');
  const users = getUsers();
  
  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--muted);">No hay usuarios registrados</td></tr>';
    return;
  }
  
  tbody.innerHTML = users.map(u => `
    <tr>
      <td><strong>${u.nombre}</strong></td>
      <td>${u.usuario}</td>
      <td><span class="role-badge ${u.rol}">${u.rol}</span></td>
      <td>${u.estado}</td>
      <td>
        <button class="action-btn edit" onclick="editUser(${u.id})">Editar</button>
        <button class="action-btn delete" onclick="deleteUser(${u.id})">Eliminar</button>
      </td>
    </tr>
  `).join('');
}

// ============ ESTADÍSTICAS ============
function updateStats() {
  const productos = getProducts();
  ventasHoy = parseFloat(localStorage.getItem('demifar_ventas') || '0');
  
  document.getElementById('statVentas').textContent = `Bs. ${ventasHoy.toFixed(2)}`;
  document.getElementById('statCriticos').textContent = productos.filter(p => p.stock < 10).length;
  document.getElementById('statProductos').textContent = productos.length;
  const valor = productos.reduce((sum, p) => sum + (p.precio * p.stock), 0);
  document.getElementById('statValor').textContent = `Bs. ${valor.toFixed(2)}`;
}

// ============ UI INTERACTIONS ============
floatingCartBtn.addEventListener('click', () => {
  cartDrawer.classList.add('open');
  cartDrawer.setAttribute('aria-hidden', 'false');
});

closeCartBtn.addEventListener('click', () => {
  cartDrawer.classList.remove('open');
  cartDrawer.setAttribute('aria-hidden', 'true');
});

cartDrawer.addEventListener('click', (e) => {
  if (e.target === cartDrawer) {
    cartDrawer.classList.remove('open');
  }
});

window.closeModal = closeModal;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}