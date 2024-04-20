import { promises as fs } from 'fs';
import path from 'path';
import { NodeSSH } from 'node-ssh';

let privateKey = '';
const ssh = new NodeSSH();

export async function removeDomain(domainName: string): Promise<void> {
  const server = process.env.SERVER;
  const [serverUser, serverIp] = server.split('@');
  try {
    privateKey = await fs.readFile(
      path.resolve(path.join('src', 'script', 'omnimenu-pwa.pem')),
      'utf8',
    );
  } catch (error) {
    throw new Error('Failed to read file: ' + error);
  }

  try {
    await ssh.connect({
      host: serverIp,
      username: serverUser,
      privateKey: privateKey,
    });

    console.log('login success');
    // Step 1: Sync SSL certificates
    await ssh.execCommand(`sudo rm /etc/nginx/ssl/${domainName}.crt`);
    await ssh.execCommand(`sudo rm /etc/nginx/ssl/${domainName}.key`);
    console.log('SSL Certificates remove successfully');

    // Step 2: Sync Nginx configuration
    await ssh.execCommand(
      `sudo rm /etc/nginx/sites-enabled/${domainName}.conf`,
    );
    await ssh.execCommand(
      `sudo rm /etc/nginx/sites-sites-available/${domainName}.conf`,
    );
    console.log('Nginx configuration remove successfully');

    // Step 3: Check Nginx Configuration
    const nginxTest = await ssh.execCommand('nginx -t');
    if (nginxTest.code !== 0)
      throw new Error('Wrong Nginx Configuration: ' + nginxTest.stderr);

    console.log('Nginx Configuration is correct');

    // Step 4: Reload Nginx
    const reloadNginx = await ssh.execCommand('systemctl reload nginx');
    if (reloadNginx.code !== 0)
      throw new Error('Failed to reload Nginx: ' + reloadNginx.stderr);

    console.log('Nginx reloaded successfully');
    console.log('Deployment completed successfully');
  } catch (error) {
    console.error('Deployment failed:', error);
  } finally {
    ssh.dispose();
  }
}
