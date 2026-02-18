async function main() {
  try {
    const res = await fetch('http://localhost:3001/suppliers/debug/permissions');
    const data = await res.json();
    
    console.log('--- ROLES ---');
    data.roles.forEach(r => {
      if (r.name === 'Compras') {
        console.log(`Rol: ${r.name}`);
        console.log(`Permisos: ${JSON.stringify(r.permissions)}`);
      }
    });
  } catch (e) {
    console.error(e);
  }
}
main();
