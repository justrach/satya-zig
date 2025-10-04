const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

    // Create validator module
    const validator_mod = b.addModule("validator", .{
        .root_source_file = b.path("src/validator.zig"),
    });

    const combinators_mod = b.addModule("combinators", .{
        .root_source_file = b.path("src/combinators.zig"),
    });
    combinators_mod.addImport("validator", validator_mod);
    const json_validator_mod = b.addModule("json_validator", .{
        .root_source_file = b.path("src/json_validator.zig"),
    });
    json_validator_mod.addImport("validator", validator_mod);

    // Creates a step for building the library
    const lib = b.addLibrary(.{
        .name = "satya-zig",
        .root_module = b.createModule(.{
            .root_source_file = b.path("src/root.zig"),
            .target = target,
            .optimize = optimize,
        }),
        .linkage = .static,
    });
    lib.root_module.addImport("validator", validator_mod);
    lib.root_module.addImport("combinators", combinators_mod);
    lib.root_module.addImport("json_validator", json_validator_mod);

    b.installArtifact(lib);

    // Example: basic_usage
    const basic_example = b.addExecutable(.{
        .name = "basic_usage",
        .root_module = b.createModule(.{
            .root_source_file = b.path("examples/basic_usage.zig"),
            .target = target,
            .optimize = optimize,
        }),
    });
    basic_example.root_module.addImport("validator", validator_mod);
    basic_example.root_module.addImport("combinators", combinators_mod);

    const run_basic = b.addRunArtifact(basic_example);
    const basic_step = b.step("run-basic", "Run basic usage example");
    basic_step.dependOn(&run_basic.step);

    // Example: json_example
    const json_example = b.addExecutable(.{
        .name = "json_example",
        .root_module = b.createModule(.{
            .root_source_file = b.path("examples/json_example.zig"),
            .target = target,
            .optimize = optimize,
        }),
    });
    json_example.root_module.addImport("validator", validator_mod);
    json_example.root_module.addImport("json_validator", json_validator_mod);

    const run_json = b.addRunArtifact(json_example);
    const json_step = b.step("run-json", "Run JSON validation example");
    json_step.dependOn(&run_json.step);

    // Example: advanced_example
    const advanced_example = b.addExecutable(.{
        .name = "advanced_example",
        .root_module = b.createModule(.{
            .root_source_file = b.path("examples/advanced_example.zig"),
            .target = target,
            .optimize = optimize,
        }),
    });
    advanced_example.root_module.addImport("validator", validator_mod);
    advanced_example.root_module.addImport("combinators", combinators_mod);
    advanced_example.root_module.addImport("json_validator", json_validator_mod);

    const run_advanced = b.addRunArtifact(advanced_example);
    const advanced_step = b.step("run-advanced", "Run advanced validation example");
    advanced_step.dependOn(&run_advanced.step);

    // Run all examples
    const run_all = b.step("run-all", "Run all examples");
    run_all.dependOn(&run_basic.step);
    run_all.dependOn(&run_json.step);
    run_all.dependOn(&run_advanced.step);

    // Tests for validator module
    const validator_tests = b.addTest(.{
        .root_module = b.createModule(.{
            .root_source_file = b.path("src/validator.zig"),
            .target = target,
            .optimize = optimize,
        }),
    });

    const run_validator_tests = b.addRunArtifact(validator_tests);

    // Tests for combinators module
    const combinators_tests = b.addTest(.{
        .root_module = b.createModule(.{
            .root_source_file = b.path("src/combinators.zig"),
            .target = target,
            .optimize = optimize,
        }),
    });
    combinators_tests.root_module.addImport("validator", validator_mod);

    const run_combinators_tests = b.addRunArtifact(combinators_tests);

    // Tests for json_validator module
    const json_validator_tests = b.addTest(.{
        .root_module = b.createModule(.{
            .root_source_file = b.path("src/json_validator.zig"),
            .target = target,
            .optimize = optimize,
        }),
    });
    json_validator_tests.root_module.addImport("validator", validator_mod);

    const run_json_validator_tests = b.addRunArtifact(json_validator_tests);

    // Test step runs all tests
    const test_step = b.step("test", "Run unit tests");
    test_step.dependOn(&run_validator_tests.step);
    test_step.dependOn(&run_combinators_tests.step);
    test_step.dependOn(&run_json_validator_tests.step);

    // Benchmark executable
    const benchmark = b.addExecutable(.{
        .name = "benchmark",
        .root_module = b.createModule(.{
            .root_source_file = b.path("benchmarks/benchmark.zig"),
            .target = target,
            .optimize = .ReleaseFast,
        }),
    });
    benchmark.root_module.addImport("validator", validator_mod);
    benchmark.root_module.addImport("combinators", combinators_mod);
    benchmark.root_module.addImport("json_validator", json_validator_mod);

    const run_benchmark = b.addRunArtifact(benchmark);
    const bench_step = b.step("bench", "Run performance benchmarks");
    bench_step.dependOn(&run_benchmark.step);
}
