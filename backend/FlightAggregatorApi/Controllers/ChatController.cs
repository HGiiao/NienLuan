using Microsoft.AspNetCore.Mvc;
using FlightAggregatorApi.Services;

namespace FlightAggregatorApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ChatController : ControllerBase
{
    private readonly ChatBotService _chatBot;

    public ChatController(ChatBotService chatBot)
    {
        _chatBot = chatBot;
    }

    /// <summary>
    /// Phân tích tin nhắn tiếng Việt của khách hàng và gợi ý các phương tiện
    /// phù hợp (máy bay / xe khách / tàu hỏa) kèm link điều hướng.
    /// </summary>
    [HttpPost("recommend")]
    public async Task<IActionResult> Recommend([FromBody] ChatRequest request)
    {
        var result = await _chatBot.RecommendAsync(request?.Message ?? "");
        return Ok(result);
    }
}

public class ChatRequest
{
    public string Message { get; set; } = string.Empty;
}
