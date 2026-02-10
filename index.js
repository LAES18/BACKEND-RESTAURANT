
require('dotenv').config(); // Carga variables de entorno desde .env

const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');

const app = express();
const port = process.env.PORT || 3001;

// CORS config - Railway + Servidor Local + Cloudflare Tunnel
const allowedOrigins = [
  'https://frontend-restaurant-production.up.railway.app', // correct domain (https)
  'http://frontend-restaurant-production.up.railway.app', // correct domain (http)
  'https://fronend-restaurant-production.up.railway.app',  // typo domain (https)
  'http://fronend-restaurant-production.up.railway.app',   // typo domain (http)
  'http://localhost:5173',
  'http://localhost:5176',  // Added the correct port
  'http://192.168.0.12',     // Servidor local IP
  'http://192.168.0.12:3000', // Servidor local con puerto
  'http://192.168.0.12:80',   // Nginx puerto 80
  'https://restaurante.lesterex.cloud' // Cloudflare Tunnel domain
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));

// Handler explícito para preflight OPTIONS en /api/* (Railway only)
app.options('/api/*', (req, res) => {
  const origin = req.headers.origin;
  if (!origin || allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.sendStatus(200);
  } else {
    res.sendStatus(403);
  }
});

// Handler explícito para preflight OPTIONS en la raíz (Railway only)
app.options('/', (req, res) => {
  const origin = req.headers.origin;
  if (!origin || allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.sendStatus(200);
  } else {
    res.sendStatus(403);
  }
});

app.use(bodyParser.json());

// Usa un pool de conexiones para MySQL (recomendado en Railway)
const db = mysql.createPool({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT ? parseInt(process.env.MYSQLPORT) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Prueba la conexión al pool
// (esto solo para loguear si conecta bien al iniciar)
db.getConnection((err, connection) => {
  if (err) {
    console.error('Error al conectar con MySQL (pool):', err);
  } else {
    console.log('Conexión exitosa a MySQL Railway (pool)');
    connection.release();
  }
});

// Inicializar base de datos de forma secuencial
const initializeDatabase = async () => {
  const queries = [
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role ENUM('administrador', 'mesero', 'cocina', 'cobrador') NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS dishes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      type ENUM('desayuno', 'almuerzo', 'cena', 'bebida', 'postre', 'principal') NOT NULL DEFAULT 'principal',
      price DECIMAL(10, 2) NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      waiter_name VARCHAR(255),
      status ENUM('pendiente', 'en_proceso', 'servido', 'pagado') DEFAULT 'pendiente',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      mesa VARCHAR(10),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );`,
    `CREATE TABLE IF NOT EXISTS order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      dish_id INT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (dish_id) REFERENCES dishes(id)
    );`,
    `CREATE TABLE IF NOT EXISTS payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      total DECIMAL(10, 2) NOT NULL,
      paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      method VARCHAR(50),
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );`,
  ];

  for (const query of queries) {
    try {
      await new Promise((resolve, reject) => {
        db.query(query, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } catch (err) {
      console.error('Error al inicializar la base de datos:', err);
    }
  }
};

initializeDatabase();

// Eliminar columna dish_id de orders si existe (solo la primera vez)
db.query("SHOW COLUMNS FROM orders LIKE 'dish_id'", (err, results) => {
  if (!err && results.length > 0) {
    db.query("ALTER TABLE orders DROP COLUMN dish_id", (err2) => {
      if (err2) {
        console.error('No se pudo eliminar dish_id de orders:', err2);
      } else {
        console.log('Columna dish_id eliminada de orders');
      }
    });
  }
});

// Modificaciones para soportar órdenes con múltiples platillos y mesa
const alterQueries = [
  `ALTER TABLE orders ADD COLUMN mesa VARCHAR(10)`,
  `ALTER TABLE orders ADD COLUMN waiter_name VARCHAR(255)`,
  `ALTER TABLE orders ADD COLUMN daily_order_number INT`,
  `ALTER TABLE orders ADD COLUMN notes TEXT`,
  `ALTER TABLE users ADD COLUMN first_name VARCHAR(100)`,
  `ALTER TABLE users ADD COLUMN last_name VARCHAR(100)`,
  `ALTER TABLE payments ADD COLUMN method VARCHAR(50)`,
  `ALTER TABLE dishes MODIFY COLUMN type ENUM('desayuno', 'almuerzo', 'cena', 'bebida', 'postre', 'principal') NOT NULL DEFAULT 'principal'`,
  `ALTER TABLE order_items ADD COLUMN status VARCHAR(20) DEFAULT 'pendiente'`
];

// Ejecutar migraciones secuencialmente para evitar deadlocks
let migrationIndex = 0;
function runNextMigration() {
  if (migrationIndex >= alterQueries.length) {
    // Después de agregar la columna status, actualizar items antiguos
    setTimeout(() => {
      db.query(`
        UPDATE order_items oi
        JOIN orders o ON oi.order_id = o.id
        SET oi.status = 'servido'
        WHERE oi.status = 'pendiente' 
        AND o.status IN ('servido', 'pagado')
      `, (err) => {
        if (err) {
          console.error('[DATA MIGRATION] Error al actualizar items antiguos:', err.code);
        } else {
          console.log('[DATA MIGRATION] Items antiguos actualizados a servido');
        }
      });
    }, 500);
    return;
  }
  
  const query = alterQueries[migrationIndex];
  db.query(query, (err) => {
    if (err && err.code !== 'ER_DUP_FIELDNAME' && err.code !== 'ER_CANT_DROP_FIELD_OR_KEY') {
      console.error('[MIGRATION ERROR]', query.substring(0, 50), ':', err.code);
    }
    migrationIndex++;
    setTimeout(runNextMigration, 100); // Esperar 100ms entre migraciones
  });
}
runNextMigration();

// La tabla order_items ya se crea en initializeDatabase, así que eliminamos esta duplicación

// Asegura que el ENUM de 'role' en users sea correcto al iniciar el backend SOLO si es necesario
const checkRoleEnum = `SHOW COLUMNS FROM users LIKE 'role';`;
db.query(checkRoleEnum, (err, results) => {
  if (!err && results && results[0]) {
    const type = results[0].Type;
    if (!type.includes("'administrador'") || !type.includes("'mesero'") || !type.includes("'cocina'") || !type.includes("'cobrador'")) {
      const alterRoleEnum = `ALTER TABLE users MODIFY COLUMN role ENUM('administrador', 'mesero', 'cocina', 'cobrador') NOT NULL;`;
      db.query(alterRoleEnum, (err2) => {
        if (err2) {
          console.error("Error al actualizar el tipo ENUM de 'role' en la tabla 'users':", err2);
        } else {
          console.log("Tipo ENUM de 'role' en la tabla 'users' actualizado correctamente.");
        }
      });
    } else {
      console.log("El ENUM de 'role' ya es correcto.");
    }
  } else if (err) {
    console.error("Error al verificar el tipo ENUM de 'role':", err);
  }
});

// Prefijo para todas las rutas de API
const api = express.Router();

// Log global para todas las peticiones a /api/*
api.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.originalUrl} - Body:`, req.body);
  next();
});

// Handler explícito para preflight OPTIONS en todas las rutas de API (Railway only)
api.options('*', (req, res) => {
  const origin = req.headers.origin;
  if (!origin || allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.sendStatus(200);
  } else {
    res.sendStatus(403);
  }
});

// Rutas para manejar roles y autenticación
api.post('/register', (req, res) => {
  const { first_name, last_name, name, email, password, role } = req.body;

  // Log de los datos recibidos
  console.log('Intentando registrar usuario:', { first_name, last_name, name, email, password, role });

  // Validar que todos los campos estén presentes
  if (!email || !password || !role) {
    console.log('Faltan campos en el registro:', req.body);
    return res.status(400).json({ error: 'Email, password y rol son obligatorios' });
  }

  // Si se proporcionan first_name y last_name, usarlos; si no, usar name
  const firstName = first_name || name || '';
  const lastName = last_name || '';
  const fullName = first_name && last_name ? `${first_name} ${last_name}` : name || `${firstName} ${lastName}`.trim();

  if (!firstName) {
    console.log('Falta nombre en el registro:', req.body);
    return res.status(400).json({ error: 'El nombre es obligatorio' });
  }

  // Validar formato del correo electrónico
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.log('Formato de correo inválido:', email);
    return res.status(400).json({ error: 'Formato de correo electrónico inválido' });
  }

  // Validar que el rol sea uno de los permitidos
  const allowedRoles = ['administrador', 'mesero', 'cocina', 'cobrador'];
  if (!allowedRoles.includes(role)) {
    console.log('Rol inválido:', role);
    return res.status(400).json({ error: `Rol inválido. Debe ser uno de: ${allowedRoles.join(', ')}` });
  }

  // Hashear la contraseña antes de guardarla
  bcrypt.hash(password, 10, (hashErr, hashedPassword) => {
    if (hashErr) {
      console.error('Error al hashear contraseña:', hashErr);
      return res.status(500).json({ error: 'Error al procesar la contraseña' });
    }

    const query = 'INSERT INTO users (first_name, last_name, name, email, password, role) VALUES (?, ?, ?, ?, ?, ?)';
    db.query(query, [firstName, lastName, fullName, email, hashedPassword, role], (err) => {
      if (err) {
        console.error('Error al registrar usuario:', err);
        // Log detallado para depuración
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ error: 'El correo electrónico ya está registrado', details: err.sqlMessage });
        }
        return res.status(500).json({ error: 'Error al registrar usuario', details: err.sqlMessage || err.message || err });
      }
      // Retornar JSON en lugar de texto plano
      res.status(201).json({ 
        success: true, 
        message: 'Usuario registrado exitosamente',
        user: { first_name: firstName, last_name: lastName, name: fullName, email, role }
      });
    });
  });
});

api.post('/login', (req, res) => {
  const { email, password } = req.body;
  const query = 'SELECT id, first_name, last_name, name, email, password, role FROM users WHERE email = ? OR name = ?';
  db.query(query, [email, email], (err, results) => {
    if (err) {
      console.error('Error en login:', err);
      return res.status(500).send('Error en el servidor');
    }
    
    if (results.length === 0) {
      return res.status(401).send('Credenciales inválidas');
    }

    const user = results[0];
    
    // Comparar la contraseña con bcrypt
    bcrypt.compare(password, user.password, (compareErr, isMatch) => {
      if (compareErr) {
        console.error('Error al comparar contraseña:', compareErr);
        return res.status(500).send('Error en el servidor');
      }
      
      if (!isMatch) {
        return res.status(401).send('Credenciales inválidas');
      }
      
      // Asegurarse de que el nombre completo está disponible
      if (!user.name && user.first_name) {
        user.name = `${user.first_name} ${user.last_name || ''}`.trim();
      }
      
      // No enviar la contraseña en la respuesta
      delete user.password;
      res.status(200).json(user);
    });
  });
});

// Rutas para manejar platillos
api.get('/dishes', (req, res) => {
  const type = req.query.type;
  let query = 'SELECT * FROM dishes';
  const params = [];
  if (type && ['desayuno', 'almuerzo', 'cena'].includes(type)) {
    query += ' WHERE type = ?';
    params.push(type);
  }
  db.query(query, params, (err, results) => {
    if (err) {
      res.status(500).send('Error al obtener platillos');
    } else {
      res.status(200).json(results);
    }
  });
});

// Endpoint para importar platillos desde Excel (bulk)
api.post('/dishes/bulk', (req, res) => {
  const dishes = req.body;
  
  if (!Array.isArray(dishes) || dishes.length === 0) {
    return res.status(400).json({ error: 'Se requiere un array de platillos' });
  }
  
  // Validar cada platillo
  for (let i = 0; i < dishes.length; i++) {
    const dish = dishes[i];
    if (!dish.name || !dish.price) {
      return res.status(400).json({
        error: `Platillo ${i + 1}: Nombre y precio son obligatorios`
      });
    }
  }
  
  // Insertar todos los platillos
  const values = dishes.map(dish => [
    dish.name,
    dish.type || 'principal',
    parseFloat(dish.price),
    dish.image_url || null
  ]);
  
  db.query(
    'INSERT INTO dishes (name, type, price, image_url) VALUES ?',
    [values],
    (err, result) => {
      if (err) {
        console.error('Error al importar platillos:', err);
        return res.status(500).json({ error: 'Error al importar platillos', details: err.message });
      }
      res.status(200).json({
        message: 'Platillos importados exitosamente',
        insertedCount: result.affectedRows
      });
    }
  );
});

// Endpoint para actualizar un platillo
api.put('/dishes/:id', (req, res) => {
  const dishId = req.params.id;
  const { name, price, type, image_url } = req.body;
  
  // Construir query dinámicamente
  const updates = [];
  const values = [];
  
  if (name !== undefined) {
    updates.push('name = ?');
    values.push(name);
  }
  if (price !== undefined) {
    updates.push('price = ?');
    values.push(parseFloat(price));
  }
  if (type !== undefined) {
    updates.push('type = ?');
    values.push(type);
  }
  if (image_url !== undefined) {
    updates.push('image_url = ?');
    values.push(image_url || null);
  }
  
  if (updates.length === 0) {
    return res.status(400).json({ error: 'No se proporcionaron campos para actualizar' });
  }
  
  values.push(dishId);
  const query = `UPDATE dishes SET ${updates.join(', ')} WHERE id = ?`;
  
  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error al actualizar platillo:', err);
      return res.status(500).json({ error: 'Error al actualizar platillo', details: err.message });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Platillo no encontrado' });
    }
    res.status(200).json({ message: 'Platillo actualizado exitosamente' });
  });
});

api.post('/dishes', (req, res) => {
  const { name, type, price, image_url } = req.body;
  
  // Validar campos requeridos
  if (!name || !price) {
    return res.status(400).json({ error: 'Nombre y precio son obligatorios' });
  }
  
  // Si no se proporciona tipo, usar 'principal' por defecto
  const dishType = type || 'principal';
  const imageValue = image_url || null;
  
  const query = 'INSERT INTO dishes (name, type, price, image_url) VALUES (?, ?, ?, ?)';
  db.query(query, [name, dishType, price, imageValue], (err, result) => {
    if (err) {
      console.error('Error al agregar platillo:', err);
      return res.status(500).json({ error: 'Error al agregar platillo', details: err.message });
    }
    res.status(200).json({ 
      success: true, 
      message: 'Platillo agregado exitosamente',
      id: result.insertId 
    });
  });
});

// Rutas para manejar órdenes
api.get('/orders', (req, res) => {
  const { status, date, month, unpaid } = req.query;
  let query = `SELECT o.*, 
    GROUP_CONCAT(d.name ORDER BY oi.id) as dishes, 
    GROUP_CONCAT(d.type ORDER BY oi.id) as types, 
    GROUP_CONCAT(d.price ORDER BY oi.id) as prices,
    MAX(p.id) as payment_id
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    JOIN dishes d ON oi.dish_id = d.id
    LEFT JOIN payments p ON o.id = p.order_id`;
  const params = [];

  let where = [];
  let having = [];
  
  if (status) {
    where.push('o.status = ?');
    params.push(status);
  }
  if (date) {
    where.push('DATE(o.created_at) = DATE(?)');
    params.push(date);
  }
  if (month) {
    where.push('DATE_FORMAT(o.created_at, "%Y-%m") = DATE_FORMAT(?, "%Y-%m")');
    params.push(month);
  }
  
  if (where.length > 0) {
    query += ' WHERE ' + where.join(' AND ');
  }

  query += ' GROUP BY o.id';
  
  if (unpaid === 'true') {
    query += ' HAVING MAX(p.id) IS NULL';
  }
  
  query += ' ORDER BY o.created_at ASC, o.mesa ASC';

  console.log('[DEBUG] Query:', query);
  console.log('[DEBUG] Params:', params);

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('[ERROR] Error en query /api/orders:', err);
      res.status(500).send('Error al obtener órdenes');
    } else {
      // Asegura que los campos dishes/types/prices sean arrays y price sea numérico
      const formatted = results.map(r => {
        let dishesArr = [], typesArr = [], pricesArr = [];
        if (r.dishes && r.types && r.prices) {
          dishesArr = r.dishes.split(',');
          typesArr = r.types.split(',');
          pricesArr = r.prices.split(',');
        }
        
        // Crear array de platos y calcular total
        const dishesWithPrices = dishesArr.map((name, i) => ({
          name,
          type: typesArr[i],
          price: Number.isFinite(parseFloat(pricesArr[i])) ? parseFloat(pricesArr[i]) : 0
        }));
        
        const total = dishesWithPrices.reduce((sum, dish) => sum + dish.price, 0);
        
        return {
          ...r,
          dishes: dishesWithPrices,
          total: total
        };
      });
      res.status(200).json(formatted);
    }
  });
});

// Endpoint específico para cocina: devuelve órdenes con items pendientes de preparar
api.get('/orders/kitchen', (req, res) => {
  const query = `
    SELECT o.*, 
      GROUP_CONCAT(CASE WHEN oi.status = 'pendiente' THEN d.name END ORDER BY oi.id) as pending_dishes,
      GROUP_CONCAT(CASE WHEN oi.status = 'pendiente' THEN d.type END ORDER BY oi.id) as pending_types,
      GROUP_CONCAT(CASE WHEN oi.status = 'pendiente' THEN d.price END ORDER BY oi.id) as pending_prices
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    JOIN dishes d ON oi.dish_id = d.id
    WHERE oi.status = 'pendiente'
    GROUP BY o.id
    ORDER BY o.created_at ASC, o.mesa ASC
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('[ERROR] Error en query /api/orders/kitchen:', err);
      return res.status(500).send('Error al obtener órdenes de cocina');
    }
    
    const formatted = results.map(r => {
      let dishesArr = [], typesArr = [], pricesArr = [];
      if (r.pending_dishes && r.pending_types && r.pending_prices) {
        dishesArr = r.pending_dishes.split(',').filter(Boolean);
        typesArr = r.pending_types.split(',').filter(Boolean);
        pricesArr = r.pending_prices.split(',').filter(Boolean);
      }
      
      const dishesWithPrices = dishesArr.map((name, i) => ({
        name,
        type: typesArr[i],
        price: parseFloat(pricesArr[i]) || 0
      }));
      
      const total = dishesWithPrices.reduce((sum, dish) => sum + dish.price, 0);
      
      return {
        ...r,
        dishes: dishesWithPrices,
        total: total
      };
    });
    
    res.status(200).json(formatted);
  });
});

api.post('/orders', (req, res) => {
  const { dishes, user_id, mesa, waiter_name, notes } = req.body;
  if (!dishes || !Array.isArray(dishes) || dishes.length === 0) {
    return res.status(400).send('No se enviaron platillos');
  }
  
  // Obtener el número de orden del día actual
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const getDailyNumberQuery = `
    SELECT COALESCE(MAX(daily_order_number), 0) + 1 as next_number 
    FROM orders 
    WHERE DATE(created_at) = ?
  `;
  
  db.query(getDailyNumberQuery, [today], (err, result) => {
    if (err) {
      console.error('Error al obtener número de orden diario:', err);
      return res.status(500).send('Error al obtener número de orden');
    }
    
    const dailyOrderNumber = result[0].next_number;
    
    // Crear la orden con el número diario y notas
    const orderQuery = 'INSERT INTO orders (user_id, mesa, waiter_name, daily_order_number, notes) VALUES (?, ?, ?, ?, ?)';
    db.query(orderQuery, [user_id, mesa, waiter_name || null, dailyOrderNumber, notes || null], (err, result) => {
      if (err) {
        console.error('Error al crear orden:', err);
        return res.status(500).send('Error al crear orden');
      }
      const orderId = result.insertId;
      const items = dishes.map(d => [orderId, d.dish_id, 'pendiente']);
      db.query('INSERT INTO order_items (order_id, dish_id, status) VALUES ?', [items], (err2) => {
        if (err2) {
          console.error('Error al agregar platillos:', err2);
          return res.status(500).send('Error al agregar platillos a la orden');
        }
        res.status(200).json({ orderId, dailyOrderNumber });
      });
    });
  });
});

// Actualizar estado de la orden (para cocina)
api.patch('/orders/:id', (req, res) => {
  const { status } = req.body;
  const orderId = req.params.id;
  
  db.query('UPDATE orders SET status = ? WHERE id = ?', [status, orderId], (err) => {
    if (err) return res.status(500).send('Error al actualizar estado');
    
    // Si se marca como 'servido', marcar todos los items pendientes como 'servido'
    if (status === 'servido') {
      db.query('UPDATE order_items SET status = ? WHERE order_id = ? AND status = ?', 
        ['servido', orderId, 'pendiente'], (itemErr) => {
          if (itemErr) {
            console.error('Error al actualizar status de items:', itemErr);
          }
        });
    }
    
    res.status(200).send('Estado actualizado');
  });
});

// Actualizar orden - agregar platillos y/o actualizar notas
api.put('/orders/:id', (req, res) => {
  const orderId = req.params.id;
  const { newDishes, notes, waiter_name } = req.body;
  
  // Actualizar las notas y/o nombre del mesero si se enviaron
  const updateFields = [];
  const updateValues = [];
  
  if (notes !== undefined) {
    updateFields.push('notes = ?');
    updateValues.push(notes);
  }
  
  if (waiter_name !== undefined) {
    updateFields.push('waiter_name = ?');
    updateValues.push(waiter_name);
  }
  
  if (updateFields.length > 0) {
    updateValues.push(orderId);
    const updateQuery = `UPDATE orders SET ${updateFields.join(', ')} WHERE id = ?`;
    db.query(updateQuery, updateValues, (err) => {
      if (err) {
        console.error('Error al actualizar orden:', err);
        return res.status(500).json({ error: 'Error al actualizar orden' });
      }
    });
  }
  
  // Si hay nuevos platillos, agregarlos con status='pendiente' para que pasen por cocina
  // IMPORTANTE: La orden mantiene su status actual (servido), solo los nuevos items van a cocina
  if (newDishes && Array.isArray(newDishes) && newDishes.length > 0) {
    const items = newDishes.map(d => [orderId, d.dish_id, 'pendiente']);
    db.query('INSERT INTO order_items (order_id, dish_id, status) VALUES ?', [items], (err) => {
      if (err) {
        console.error('Error al agregar nuevos platillos:', err);
        return res.status(500).json({ error: 'Error al agregar platillos' });
      }
      
      // NO cambiar el status de la orden - la orden sigue en "servido" (caja)
      // Solo los nuevos items tienen status='pendiente' y aparecerán en cocina
      res.status(200).json({ message: 'Orden actualizada correctamente, nuevos platillos enviados a cocina' });
    });
  } else {
    res.status(200).json({ message: 'Orden actualizada correctamente' });
  }
});

// Rutas para manejar cobros
api.get('/payments', (req, res) => {
  const { date, month } = req.query;
  let query = `SELECT p.*, o.mesa, o.waiter_name 
               FROM payments p 
               LEFT JOIN orders o ON p.order_id = o.id`;
  const params = [];
  let where = [];
  if (date) {
    where.push('DATE(p.paid_at) = DATE(?)');
    params.push(date);
  }
  if (month) {
    where.push('DATE_FORMAT(p.paid_at, "%Y-%m") = DATE_FORMAT(?, "%Y-%m")');
    params.push(month);
  }
  if (where.length > 0) {
    query += ' WHERE ' + where.join(' AND ');
  }
  query += ' ORDER BY p.paid_at DESC';
  db.query(query, params, (err, results) => {
    if (err) {
      res.status(500).send('Error al obtener pagos');
    } else {
      res.status(200).json(results);
    }
  });
});

// Ruta para reportes de pagos con detalles completos
api.get('/payments/report', (req, res) => {
  const { type, date } = req.query;
  
  if (!type) {
    return res.status(400).json({
      error: 'Parámetros incompletos',
      details: 'Se requiere el parámetro type'
    });
  }

  if (type !== 'diario' && type !== 'mensual') {
    return res.status(400).json({
      error: 'Tipo de reporte inválido',
      details: 'El tipo debe ser "diario" o "mensual"'
    });
  }

  const today = new Date().toISOString().split('T')[0];
  const reportDate = date || today;
  
  // Query para obtener todos los detalles de ventas
  let query = `
    SELECT 
      p.id as payment_id,
      p.order_id,
      o.daily_order_number,
      DATE_FORMAT(p.paid_at, '%Y-%m-%d') as fecha,
      p.total as total_orden,
      p.method,
      o.mesa,
      o.waiter_name as mesero,
      d.name as producto,
      d.price as precio_producto,
      d.type as tipo_producto
    FROM payments p
    INNER JOIN orders o ON p.order_id = o.id
    INNER JOIN order_items oi ON o.id = oi.order_id
    INNER JOIN dishes d ON oi.dish_id = d.id
  `;

  const params = [];

  if (type === 'diario') {
    query += ' WHERE DATE(p.paid_at) = DATE(?)';
    params.push(reportDate);
  } else if (type === 'mensual') {
    query += ' WHERE DATE_FORMAT(p.paid_at, "%Y-%m") = DATE_FORMAT(?, "%Y-%m")';
    params.push(reportDate);
  }

  query += ' ORDER BY p.paid_at ASC, p.id, d.name';

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Error al generar reporte:', err);
      return res.status(500).json({
        error: 'Error al generar reporte',
        details: err.message
      });
    }

    // Agrupar resultados por fecha
    const reportByDate = {};
    let totalGeneral = 0;

    results.forEach(row => {
      const fecha = row.fecha;
      
      if (!reportByDate[fecha]) {
        reportByDate[fecha] = {
          fecha: fecha,
          ordenes: [],
          totalDia: 0,
          numeroOrdenes: 0
        };
      }

      // Buscar si ya existe esta orden
      let orden = reportByDate[fecha].ordenes.find(o => o.order_id === row.order_id);
      
      if (!orden) {
        orden = {
          order_id: row.order_id,
          daily_order_number: row.daily_order_number,
          mesa: row.mesa,
          mesero: row.mesero,
          method: row.method,
          total: parseFloat(row.total_orden),
          productos: []
        };
        reportByDate[fecha].ordenes.push(orden);
        reportByDate[fecha].totalDia += parseFloat(row.total_orden);
        reportByDate[fecha].numeroOrdenes++;
        totalGeneral += parseFloat(row.total_orden);
      }

      // Agregar producto a la orden
      orden.productos.push({
        nombre: row.producto,
        precio: parseFloat(row.precio_producto),
        tipo: row.tipo_producto
      });
    });

    // Convertir a array
    const reportArray = Object.values(reportByDate);

    res.status(200).json({
      type: type,
      date: reportDate,
      totalGeneral: totalGeneral,
      datos: reportArray
    });
  });
});

// Ruta para obtener una orden específica
api.get('/orders/:id', (req, res) => {
  const orderId = req.params.id;
  const query = `
    SELECT o.*, GROUP_CONCAT(d.name ORDER BY oi.id) as dishes, 
           GROUP_CONCAT(d.type ORDER BY oi.id) as types, 
           GROUP_CONCAT(d.price ORDER BY oi.id) as prices
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    JOIN dishes d ON oi.dish_id = d.id
    WHERE o.id = ?
    GROUP BY o.id`;

  db.query(query, [orderId], (err, results) => {
    if (err) {
      console.error('Error al obtener orden:', err);
      return res.status(500).json({ 
        error: 'Error al obtener la orden',
        details: err.message 
      });
    }
    if (results.length === 0) {
      return res.status(404).json({ 
        error: 'Orden no encontrada',
        details: `No se encontró la orden con ID ${orderId}`
      });
    }

    // Procesa los resultados igual que en el endpoint general
    const result = results[0];
    let dishesArr = [], typesArr = [], pricesArr = [];
    if (result.dishes && result.types && result.prices) {
      dishesArr = result.dishes.split(',');
      typesArr = result.types.split(',');
      pricesArr = result.prices.split(',');
    }
    
    const formatted = {
      ...result,
      dishes: dishesArr.map((name, i) => ({
        name,
        type: typesArr[i],
        price: Number.isFinite(parseFloat(pricesArr[i])) ? parseFloat(pricesArr[i]) : 0
      }))
    };
    
    res.status(200).json(formatted);
  });
});

// Endpoint to fetch all users
api.get('/users', (req, res) => {
  const query = 'SELECT id, name, email, role FROM users';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching users:', err);
      res.status(500).json({ error: 'Failed to fetch users' });
    } else {
      res.json(results);
    }
  });
});

// Endpoint para importar platillos desde Excel (bulk)
api.post('/dishes/bulk', (req, res) => {
  const dishes = req.body;
  
  if (!Array.isArray(dishes) || dishes.length === 0) {
    return res.status(400).json({ error: 'Se requiere un array de platillos' });
  }
  
  // Validar cada platillo
  for (let i = 0; i < dishes.length; i++) {
    const dish = dishes[i];
    if (!dish.name || !dish.price) {
      return res.status(400).json({
        error: `Platillo ${i + 1}: Nombre y precio son obligatorios`
      });
    }
  }
  
  // Insertar todos los platillos
  const values = dishes.map(dish => [
    dish.name,
    dish.type || 'principal',
    parseFloat(dish.price),
    dish.image_url || null
  ]);
  
  db.query(
    'INSERT INTO dishes (name, type, price, image_url) VALUES ?',
    [values],
    (err, result) => {
      if (err) {
        console.error('Error al importar platillos:', err);
        return res.status(500).json({ error: 'Error al importar platillos', details: err.message });
      }
      res.status(200).json({
        message: 'Platillos importados exitosamente',
        insertedCount: result.affectedRows
      });
    }
  );
});

// Endpoint para actualizar un platillo
api.put('/dishes/:id', (req, res) => {
  const dishId = req.params.id;
  const { name, price, type, image_url } = req.body;
  
  // Construir query dinámicamente
  const updates = [];
  const values = [];
  
  if (name !== undefined) {
    updates.push('name = ?');
    values.push(name);
  }
  if (price !== undefined) {
    updates.push('price = ?');
    values.push(parseFloat(price));
  }
  if (type !== undefined) {
    updates.push('type = ?');
    values.push(type);
  }
  if (image_url !== undefined) {
    updates.push('image_url = ?');
    values.push(image_url || null);
  }
  
  if (updates.length === 0) {
    return res.status(400).json({ error: 'No se proporcionaron campos para actualizar' });
  }
  
  values.push(dishId);
  const query = `UPDATE dishes SET ${updates.join(', ')} WHERE id = ?`;
  
  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error al actualizar platillo:', err);
      return res.status(500).json({ error: 'Error al actualizar platillo', details: err.message });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Platillo no encontrado' });
    }
    res.status(200).json({ message: 'Platillo actualizado exitosamente' });
  });
});

// Endpoint para actualizar un platillo
api.put('/dishes/:id', (req, res) => {
  const dishId = req.params.id;
  const { name, price, type, image_url } = req.body;
  
  // Validar que type sea uno de los valores permitidos si se proporciona
  if (type) {
    const validTypes = ['desayuno', 'almuerzo', 'cena', 'bebida', 'postre', 'entrada', 'plato_fuerte', 'guarnicion', 'aperitivo', 'snack', 'principal'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: 'Tipo de platillo inválido',
        details: `El tipo debe ser uno de: ${validTypes.join(', ')}`
      });
    }
  }
  
  // Construir query dinámicamente
  const updates = [];
  const values = [];
  
  if (name !== undefined) {
    updates.push('name = ?');
    values.push(name);
  }
  if (price !== undefined) {
    updates.push('price = ?');
    values.push(parseFloat(price));
  }
  if (type !== undefined) {
    updates.push('type = ?');
    values.push(type);
  }
  if (image_url !== undefined) {
    updates.push('image_url = ?');
    values.push(image_url || null);
  }
  
  if (updates.length === 0) {
    return res.status(400).json({ error: 'No se proporcionaron campos para actualizar' });
  }
  
  values.push(dishId);
  const query = `UPDATE dishes SET ${updates.join(', ')} WHERE id = ?`;
  
  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error al actualizar platillo:', err);
      return res.status(500).json({ error: 'Error al actualizar platillo', details: err.message });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Platillo no encontrado' });
    }
    res.status(200).json({ message: 'Platillo actualizado exitosamente' });
  });
});

// Ruta para eliminar un platillo
api.delete('/dishes/:id', (req, res) => {
  const dishId = req.params.id;

  // Eliminar referencias en la tabla order_items
  const deleteOrderItemsQuery = 'DELETE FROM order_items WHERE dish_id = ?';
  db.query(deleteOrderItemsQuery, [dishId], (err) => {
    if (err) {
      return res.status(500).send('Error al eliminar referencias del platillo en order_items');
    }

    // Eliminar el platillo después de eliminar las referencias
    const deleteDishQuery = 'DELETE FROM dishes WHERE id = ?';
    db.query(deleteDishQuery, [dishId], (err2, result) => {
      if (err2) {
        return res.status(500).send('Error al eliminar el platillo');
      } else if (result.affectedRows === 0) {
        return res.status(404).send('Platillo no encontrado');
      } else {
        return res.status(200).send('Platillo eliminado exitosamente');
      }
    });
  });
});

// Ruta para eliminar un usuario
api.delete('/users/:id', (req, res) => {
  const userId = req.params.id;

  const deleteUserQuery = 'DELETE FROM users WHERE id = ?';
  db.query(deleteUserQuery, [userId], (err, result) => {
    if (err) {
      console.error('Error al eliminar usuario:', err);
      return res.status(500).send('Error al eliminar usuario');
    } else if (result.affectedRows === 0) {
      return res.status(404).send('Usuario no encontrado');
    } else {
      return res.status(200).send('Usuario eliminado exitosamente');
    }
  });
});

// Actualizar la lógica del backend para manejar el estado 'pagado'
api.post('/payments', (req, res) => {
  const payments = req.body;

  console.log('Received Payments:', payments); // Debugging log

  if (!Array.isArray(payments) || payments.length === 0) {
    console.error('No se enviaron pagos'); // Debugging log
    return res.status(400).send('No se enviaron pagos');
  }

  // Validar que cada pago tenga las claves necesarias
  for (const payment of payments) {
    if (!payment.order_id || !payment.total || !payment.method) {
      console.error('Datos de pago inválidos:', payment); // Debugging log
      return res.status(400).send('Datos de pago inválidos');
    }
  }

  const paymentQueries = payments.map(payment => {
    return new Promise((resolve, reject) => {
      const { order_id, total, method } = payment;
      console.log('Processing Payment:', payment); // Debugging log
      db.query('INSERT INTO payments (order_id, total, method) VALUES (?, ?, ?)', [order_id, total, method], (err) => {
        if (err) {
          console.error('Error al insertar pago:', err, 'Payment Data:', payment); // Debugging log
          reject(err);
        } else {
          // Cambiar el estado de la orden a 'pagado'
          db.query('UPDATE orders SET status = ? WHERE id = ?', ['pagado', order_id], (err2) => {
            if (err2) {
              console.error('Error al actualizar estado de orden:', err2, 'Order ID:', order_id); // Debugging log
              reject(err2);
            } else {
              resolve();
            }
          });
        }
      });
    });
  });

  Promise.all(paymentQueries)
    .then(() => res.status(200).send('Pagos procesados exitosamente'))
    .catch(err => {
      console.error('Error al procesar pagos:', err); // Debugging log
      res.status(500).send('Error al procesar pagos');
    });
  });

// Ruta para actualizar detalles de usuario por ID
api.put('/users/:id', (req, res) => {
  const { name, email, password, role } = req.body;
  const userId = req.params.id;

  // Validar que los campos obligatorios estén presentes (excepto password)
  if (!name || !email || !role) {
    return res.status(400).send('Nombre, email y rol son obligatorios');
  }

  // Si no se envía contraseña o es 'unchanged', no la actualizamos
  if (password && password !== 'unchanged' && password.trim() !== '') {
    // Hashear la nueva contraseña antes de actualizar
    bcrypt.hash(password, 10, (hashErr, hashedPassword) => {
      if (hashErr) {
        console.error('Error al hashear contraseña:', hashErr);
        return res.status(500).send('Error al procesar la contraseña');
      }

      const query = 'UPDATE users SET name = ?, email = ?, password = ?, role = ? WHERE id = ?';
      const params = [name, email, hashedPassword, role, userId];

      db.query(query, params, (err, result) => {
        if (err) {
          console.error('Error al actualizar usuario:', err);
          return res.status(500).send('Error al actualizar usuario');
        } else if (result.affectedRows === 0) {
          return res.status(404).send('Usuario no encontrado');
        } else {
          return res.status(200).send('Usuario actualizado exitosamente');
        }
      });
    });
  } else {
    // Si no se cambia la contraseña, solo actualizar otros campos
    const query = 'UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?';
    const params = [name, email, role, userId];

    db.query(query, params, (err, result) => {
      if (err) {
        console.error('Error al actualizar usuario:', err);
        return res.status(500).send('Error al actualizar usuario');
      } else if (result.affectedRows === 0) {
        return res.status(404).send('Usuario no encontrado');
      } else {
        return res.status(200).send('Usuario actualizado exitosamente');
      }
    });
  }
});

// Ruta para cerrar sesión (logout)
api.post('/logout', (req, res) => {
  // Si usas cookies/sesiones, aquí deberías destruir la sesión.
  // Como este backend es stateless (sin sesiones), solo responde OK.
  res.status(200).json({ message: 'Sesión cerrada correctamente' });
});

// Usar el prefijo /api para todas las rutas de API
app.use('/api', api);

// Handler para rutas de API no encontradas (debug 404 vs 405)
app.use('/api/*', (req, res) => {
  console.log('API route not found:', req.method, req.originalUrl);
  res.status(404).json({ error: 'API route not found' });
});

// Asegura que la ruta raíz solo muestre texto plano
app.get('/', (req, res) => {
  res.type('text/plain').send('API REST corriendo');
});

app.listen(port, () => {
  console.log(`Servidor corriendo en Railway, puerto ${port}`);
});