using ByteAI.Api.ViewModels;
using ByteAI.Api.ViewModels.Common;
using ByteAI.Core.Business.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace ByteAI.Api.Controllers;

/// <summary>
/// Read-only lookup tables used for dropdowns, filters, and onboarding.
/// All endpoints are public (no auth required).
/// </summary>
[ApiController]
[Route("api/lookup")]
[Produces("application/json")]
[Tags("Lookup")]
public sealed class LookupController(ILookupBusiness lookupBusiness) : ControllerBase
{
    /// <summary>All seniority levels for onboarding selection.</summary>
    [HttpGet("seniority-types")]
    [ProducesResponseType(typeof(ApiResponse<List<SeniorityTypeResponse>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<SeniorityTypeResponse>>>> GetSeniorityTypes(CancellationToken ct)
    {
        var items = await lookupBusiness.GetSeniorityTypesAsync(ct);
        return Ok(ApiResponse<List<SeniorityTypeResponse>>.Success(
            items.Select(s => new SeniorityTypeResponse(s.Id, s.Name, s.Label, s.Icon, s.SortOrder)).ToList()));
    }

    /// <summary>All engineering domains for onboarding selection.</summary>
    [HttpGet("domains")]
    [ProducesResponseType(typeof(ApiResponse<List<DomainResponse>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<DomainResponse>>>> GetDomains(CancellationToken ct)
    {
        var items = await lookupBusiness.GetDomainsAsync(ct);
        return Ok(ApiResponse<List<DomainResponse>>.Success(
            items.Select(d => new DomainResponse(d.Id, d.Name, d.Label, d.Icon, d.SortOrder)).ToList()));
    }

    /// <summary>Subdomains, optionally filtered by domain.</summary>
    [HttpGet("subdomains")]
    [ProducesResponseType(typeof(ApiResponse<List<SubdomainResponse>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<SubdomainResponse>>>> GetSubdomains(
        [FromQuery] Guid? domainId = null,
        CancellationToken ct = default)
    {
        var items = await lookupBusiness.GetSubdomainsAsync(domainId, ct);
        return Ok(ApiResponse<List<SubdomainResponse>>.Success(
            items.Select(s => new SubdomainResponse(s.Id, s.DomainId, s.Name, s.Label, s.SortOrder)).ToList()));
    }

    /// <summary>Tech stacks, optionally filtered by subdomain.</summary>
    [HttpGet("tech-stacks")]
    [ProducesResponseType(typeof(ApiResponse<List<TechStackResponse>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<TechStackResponse>>>> GetTechStacks(
        [FromQuery] Guid? subdomainId = null,
        [FromQuery] Guid? domainId = null,
        CancellationToken ct = default)
    {
        // If domainId is provided, get tech stacks from all subdomains of that domain
        if (domainId.HasValue && !subdomainId.HasValue)
        {
            var items = await lookupBusiness.GetTechStacksByDomainAsync(domainId.Value, ct);
            return Ok(ApiResponse<List<TechStackResponse>>.Success(
                items.Select(t => new TechStackResponse(t.Id, t.SubdomainId, t.Name, t.Label, t.SortOrder)).ToList()));
        }

        // If subdomainId is provided, get tech stacks from that subdomain
        var techStacks = await lookupBusiness.GetTechStacksAsync(subdomainId, ct);
        return Ok(ApiResponse<List<TechStackResponse>>.Success(
            techStacks.Select(t => new TechStackResponse(t.Id, t.SubdomainId, t.Name, t.Label, t.SortOrder)).ToList()));
    }

    /// <summary>All badge type definitions.</summary>
    [HttpGet("badge-types")]
    [ProducesResponseType(typeof(ApiResponse<List<BadgeTypeResponse>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<BadgeTypeResponse>>>> GetBadgeTypes(CancellationToken ct)
    {
        var items = await lookupBusiness.GetBadgeTypesAsync(ct);
        return Ok(ApiResponse<List<BadgeTypeResponse>>.Success(
            items.Select(b => new BadgeTypeResponse(b.Id, b.Name, b.Label, b.Icon, b.Description)).ToList()));
    }

    /// <summary>All XP level type definitions.</summary>
    [HttpGet("level-types")]
    [ProducesResponseType(typeof(ApiResponse<List<LevelTypeResponse>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<LevelTypeResponse>>>> GetLevelTypes(CancellationToken ct)
    {
        var items = await lookupBusiness.GetLevelTypesAsync(ct);
        return Ok(ApiResponse<List<LevelTypeResponse>>.Success(
            items.Select(l => new LevelTypeResponse(l.Id, l.Level, l.Name, l.Label, l.XpRequired, l.Icon)).ToList()));
    }

    /// <summary>Searchable content types for the search screen.</summary>
    [HttpGet("search-types")]
    [ProducesResponseType(typeof(ApiResponse<List<SearchTypeResponse>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<SearchTypeResponse>>>> GetSearchTypes(CancellationToken ct)
    {
        var items = await lookupBusiness.GetSearchTypesAsync(ct);
        return Ok(ApiResponse<List<SearchTypeResponse>>.Success(
            items.Select(s => new SearchTypeResponse(s.Id, s.Name, s.Label, s.Description, s.SortOrder)).ToList()));
    }
}
