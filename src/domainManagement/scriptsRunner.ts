import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { NodeSSH } from 'node-ssh';

let privateKey = '';
const ssh = new NodeSSH();
export async function syncSslTokens(): Promise<void> {
  const server = process.env.SERVER;
  const [serverUser, serverIp] = server.split('@');
  const localNginxDir =
    '/home/yougalkumar/WebstormProjects/giftCard/src/tokens/';
  const remoteNginxDir = '/var/www/html/.well-known/acme-challenge';

  try {
    privateKey = await fs.readFile(
      '/home/yougalkumar/WebstormProjects/giftCard/src/script/omnimenu-pwa.pem',
      'utf8',
    );
  } catch (error) {
    throw new Error('Failed to read file: ' + error.message);
  }

  try {
    await ssh.connect({
      host: serverIp,
      username: serverUser,
      privateKey: privateKey,
    });

    console.log('Connecting to server...');

    // Sync SSL tokens
    const result = await ssh.putDirectory(localNginxDir, remoteNginxDir, {
      recursive: true,
      concurrency: 10,
      validate: function (itemPath) {
        const baseName = path.basename(itemPath);
        return baseName.substr(0, 1) !== '.'; // do not allow hidden files
      },
      tick: function (localPath, remotePath, error) {
        if (error) {
          console.error(
            'Failed to transfer:',
            localPath,
            'to',
            remotePath,
            'due to',
            error,
          );
        } else {
          console.log(`Successfully transferred ${localPath} to ${remotePath}`);
        }
      },
    });

    if (!result) {
      throw new Error('Failed to update Nginx configuration');
    }

    console.log('Nginx configuration updated successfully');
    console.log('Upload completed successfully');
  } catch (error) {
    console.error('Deployment failed:', error);
  } finally {
    ssh.dispose();
  }
}

export async function deployNginxConfig(domainName: string): Promise<void> {
  const server = process.env.SERVER;
  const [serverUser, serverIp] = server.split('@');
  const localNginxDir =
    '/home/yougalkumar/WebstormProjects/giftCard/src/sslCertificates/';
  const localNginxDir1 =
    '/home/yougalkumar/WebstormProjects/giftCard/src/configuration/';
  const remoteNginxDir = '/etc/nginx/sites-available/';
  const certNginxDir = '/etc/nginx/ssl/';
  fs.readFile(
    '/home/yougalkumar/WebstormProjects/giftCard/src/script/omnimenu-pwa.pem',
    'utf8',
  ).then((data) => {
    privateKey = data;
    // console.log('data', data);
  });
  try {
    privateKey = await fs.readFile(
      '/home/yougalkumar/WebstormProjects/giftCard/src/script/omnimenu-pwa.pem',
      'utf8',
    );
  } catch (error) {
    throw new Error('Failed to read file: ' + error.message);
  }

  try {
    await ssh.connect({
      host: serverIp,
      username: serverUser,
      // privateKey: `/home/yougalkumar/.ssh/id_rsa`,
      privateKey: privateKey,
    });

    console.log('login success');
    // Step 1: Sync SSL certificates
    await ssh.putDirectory(localNginxDir, certNginxDir);
    console.log('SSL Certificates updated successfully');

    // Step 2: Sync Nginx configuration
    await ssh.putDirectory(localNginxDir1, remoteNginxDir);
    await ssh.execCommand(
      `rm /etc/nginx/sites-enabled/${domainName}.conf && ln -s /etc/nginx/sites-available/${domainName}.conf /etc/nginx/sites-enabled/`,
    );
    console.log('Nginx configuration updated successfully');

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

export async function executeScript(
  domainName: string,
  path: string,
  accountUrl: string,
): Promise<any> {
  console.log(path, 'path');
  console.log(domainName, 'domainName');
  const x = await new Promise((resolve, reject) => {
    exec(`${path} ${domainName} ${accountUrl}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        reject(error);
        return;
      } else if (stderr) {
        console.error(`stderr: ${stderr}`);
        reject(stderr);
        // return;
      }
      console.log(`stdout: ${stdout}`);
      resolve(stdout);
    });
  });
  console.log(x, 'x');
  return x;
}
