import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { NodeSSH } from 'node-ssh';

let privateKey = '';
const ssh = new NodeSSH();
export async function syncSslTokens(token: string): Promise<void> {
  const server = process.env.SERVER;
  const [serverUser, serverIp] = server.split('@');
  const localNginxDir = path.resolve(path.join('src', 'tokens'));
  const remoteNginxDir = '/var/www/html/.well-known/acme-challenge';

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

    console.log('13 Connecting to server...');
    await ssh.execCommand(`rm ${remoteNginxDir}/${token}.crt`);
    await ssh
      .putFile(localNginxDir + '/' + token, remoteNginxDir + '/' + token)
      .then(
        function () {
          console.log('token add success');
        },
        function (error) {
          console.log("Something's wrong");
          console.log(error);
        },
      );
  } catch (error) {
    console.error('Deployment failed:');
  } finally {
    ssh.dispose();
  }
}

export async function deployNginxConfig(domainName: string): Promise<boolean> {
  const server = process.env.SERVER;
  const [serverUser, serverIp] = server.split('@');
  const localNginxDir = path.resolve(path.join('src', 'sslCertificates'));
  const localNginxDir1 = path.resolve(path.join('src', 'configuration'));
  const remoteNginxDir = '/etc/nginx/sites-available/';
  const certNginxDir = '/etc/nginx/ssl/';
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
    await ssh.execCommand(`rm ${certNginxDir}/${domainName}.crt`);
    try {
      await ssh.putFile(
        localNginxDir + '/' + domainName + '.crt',
        certNginxDir + domainName + '.crt',
      );
      console.log('crt add success');
    } catch (error) {
      console.log("Something's wrong");
      console.log(error);
      throw new Error('Failed to add crt');
    }

    await ssh.execCommand(`rm ${certNginxDir}/${domainName}.key`);

    console.log(localNginxDir + '/' + domainName + '.key');
    await ssh.putFile(
      localNginxDir + '/' + domainName + '.key',
      certNginxDir + domainName + '.key',
    );
    console.log('key add success');

    // Step 2: Sync Nginx configuration
    await ssh.execCommand(`rm ${remoteNginxDir}/${domainName}.conf`);
    await ssh.putFile(
      localNginxDir1 + '/' + domainName + '.conf',
      remoteNginxDir + domainName + '.conf',
    );
    console.log('conf add success');

    await ssh.execCommand(`rm /etc/nginx/sites-enabled/${domainName}.conf`);
    await ssh.execCommand(
      `ln -s /etc/nginx/sites-available/${domainName}.conf /etc/nginx/sites-enabled/`,
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
    return true;
  } catch (error) {
    console.error('Deployment failed:', error);
    return false;
  } finally {
    ssh.dispose();
  }
}

export async function executeScript(
  domainName: string,
  path: string,
  accountUrl: string,
): Promise<any> {
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
  return x;
}
