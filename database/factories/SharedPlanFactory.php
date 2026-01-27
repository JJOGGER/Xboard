<?php

namespace Database\Factories;

use App\Models\SharedPlan;
use Illuminate\Database\Eloquent\Factories\Factory;

class SharedPlanFactory extends Factory
{
    protected $model = SharedPlan::class;

    public function definition()
    {
        // Generate random pricing tiers
        $prices = [];
        $periods = ['monthly', 'quarterly', 'half_yearly', 'yearly', 'two_yearly', 'three_yearly'];
        $selectedPeriod = $this->faker->randomElement($periods);
        
        // Set at least one price
        $prices[$selectedPeriod] = $this->faker->numberBetween(500, 10000); // 5-100 yuan in cents
        
        // Optionally add more pricing tiers
        if ($this->faker->boolean(30)) {
            $otherPeriods = array_diff($periods, [$selectedPeriod]);
            $additionalPeriod = $this->faker->randomElement($otherPeriods);
            $prices[$additionalPeriod] = $this->faker->numberBetween(500, 10000);
        }
        
        return [
            'name' => $this->faker->words(3, true),
            'description' => $this->faker->sentence(),
            'subscription_url' => encrypt('https://example.com/subscription?token=test123'),
            'subscription_format' => $this->faker->randomElement(['clash', 'v2ray', 'shadowsocks']),
            'max_slots' => $this->faker->numberBetween(5, 50),
            'used_slots' => 0,
            'nodes_config' => [
                [
                    'name' => 'Test Node 1',
                    'server' => '1.2.3.4',
                    'port' => 443,
                    'type' => 'vmess',
                ],
            ],
            'nodes_count' => 1,
            'total_traffic' => $this->faker->numberBetween(100000000000, 1000000000000), // 100GB - 1TB
            'used_traffic' => 0,
            'expire_at' => now()->addDays(30),
            'last_sync_at' => now(),
            'sync_status' => 'active',
            'sync_error' => null,
            'sync_fail_count' => 0,
            'group_id' => null, // Can be set via state or relationship
            'tags' => $this->faker->boolean(50) ? [$this->faker->randomElement(['高速', '稳定', '试用', '美国', '香港'])] : null,
            'prices' => $prices,
            'is_visible' => true,
        ];
    }

    /**
     * Indicate that the plan is full.
     */
    public function full()
    {
        return $this->state(function (array $attributes) {
            return [
                'used_slots' => $attributes['max_slots'],
                'is_visible' => false,
            ];
        });
    }

    /**
     * Indicate that the plan has failed sync.
     */
    public function failed()
    {
        return $this->state(function (array $attributes) {
            return [
                'sync_status' => 'failed',
                'sync_error' => 'Connection timeout',
                'sync_fail_count' => 3,
            ];
        });
    }

    /**
     * Indicate that the plan is expired.
     */
    public function expired()
    {
        return $this->state(function (array $attributes) {
            return [
                'expire_at' => now()->subDays(1),
                'sync_status' => 'expired',
                'is_visible' => false,
            ];
        });
    }
}
