<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class CreateAdminUser extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'user:create-admin 
                            {--email= : Admin email address}
                            {--password= : Admin password}
                            {--force : Force create without confirmation}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create a new admin user';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $this->info('=== XBoard Admin User Creation ===');
        $this->newLine();

        // Get email
        $email = $this->option('email');
        if (!$email) {
            $email = $this->ask('Enter admin email address', 'admin@xboard.local');
        }

        // Validate email
        $validator = Validator::make(['email' => $email], [
            'email' => 'required|email|unique:v2_user,email'
        ]);

        if ($validator->fails()) {
            $this->error('Invalid email or email already exists!');
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }
            return Command::FAILURE;
        }

        // Get password
        $password = $this->option('password');
        if (!$password) {
            $password = $this->secret('Enter admin password (min 8 characters)');
            if (strlen($password) < 8) {
                $this->error('Password must be at least 8 characters!');
                return Command::FAILURE;
            }
            
            $passwordConfirm = $this->secret('Confirm password');
            if ($password !== $passwordConfirm) {
                $this->error('Passwords do not match!');
                return Command::FAILURE;
            }
        }

        // Confirm creation
        if (!$this->option('force')) {
            $this->newLine();
            $this->table(
                ['Field', 'Value'],
                [
                    ['Email', $email],
                    ['Password', str_repeat('*', strlen($password))],
                    ['Role', 'Administrator'],
                ]
            );
            $this->newLine();

            if (!$this->confirm('Create this admin user?', true)) {
                $this->info('Operation cancelled.');
                return Command::SUCCESS;
            }
        }

        // Create user
        try {
            $user = User::create([
                'email' => $email,
                'password' => Hash::make($password),
                'uuid' => \Illuminate\Support\Str::uuid()->toString(),
                'token' => \Illuminate\Support\Str::random(32),
                'is_admin' => 1,
                'is_staff' => 1,
                'transfer_enable' => 0,
                'u' => 0,
                'd' => 0,
                'balance' => 0,
                'commission_balance' => 0,
                'created_at' => time(),
                'updated_at' => time(),
            ]);

            $this->newLine();
            $this->info('✓ Admin user created successfully!');
            $this->newLine();
            $this->table(
                ['Field', 'Value'],
                [
                    ['User ID', $user->id],
                    ['Email', $user->email],
                    ['Is Admin', $user->is_admin ? 'Yes' : 'No'],
                    ['Is Staff', $user->is_staff ? 'Yes' : 'No'],
                ]
            );
            $this->newLine();
            $this->info('You can now login to the admin panel with these credentials.');
            $this->warn('⚠ Please change the password after first login!');

            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->error('Failed to create admin user: ' . $e->getMessage());
            return Command::FAILURE;
        }
    }
}

